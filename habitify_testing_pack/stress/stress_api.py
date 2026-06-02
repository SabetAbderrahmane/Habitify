#!/usr/bin/env python3
"""
Habitify API stress workflow.

Run only against your local/dev backend. Do not point this at someone else's server.
"""

from __future__ import annotations

import argparse
import csv
import json
import statistics
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date, timedelta
from pathlib import Path
from uuid import uuid4

import requests

REPORT_DIR = Path(__file__).resolve().parents[1] / "reports"
REPORT_DIR.mkdir(parents=True, exist_ok=True)


def timed_request(session: requests.Session, method: str, url: str, endpoint: str, **kwargs):
    start = time.perf_counter()
    error = ""
    status = 0
    try:
        response = session.request(method, url, timeout=20, **kwargs)
        status = response.status_code
        try:
            body = response.json()
        except Exception:
            body = response.text[:300]
    except Exception as exc:
        body = None
        error = repr(exc)
    latency_ms = (time.perf_counter() - start) * 1000
    return {
        "endpoint": endpoint,
        "method": method,
        "status": status,
        "latency_ms": round(latency_ms, 2),
        "ok": 200 <= status < 300,
        "error": error,
        "body_sample": str(body)[:300],
    }


def run_user_workflow(base_url: str, worker_index: int, loops: int):
    session = requests.Session()
    results = []
    email = f"stress_{worker_index}_{uuid4().hex[:10]}@example.com"
    password = "password123"

    def req(method, path, endpoint=None, **kwargs):
        result = timed_request(session, method, base_url.rstrip("/") + path, endpoint or path, **kwargs)
        results.append(result)
        return result

    signup = req("POST", "/signup", json={"email": email, "password": password})
    login = req("POST", "/login", json={"email": email, "password": password})

    token = None
    if login["ok"]:
        try:
            token = requests.Response()
        except Exception:
            pass
        # Re-request JSON directly because timed_request stores only sample.
        r = session.post(base_url.rstrip("/") + "/login", json={"email": email, "password": password}, timeout=20)
        results.append({
            "endpoint": "/login-token-read",
            "method": "POST",
            "status": r.status_code,
            "latency_ms": 0,
            "ok": r.ok,
            "error": "",
            "body_sample": "token read helper",
        })
        if r.ok:
            token = r.json()["access_token"]

    if not token:
        return results

    headers = {"Authorization": f"Bearer {token}"}

    req("GET", "/status", headers=headers)
    req("GET", "/recommended/goals")
    req("GET", "/core-habits")
    req("POST", "/profile/onboarding", headers=headers, json={
        "goal": "focus",
        "time_commitment": "15 min",
        "best_time": "Morning",
    })

    habit_ids = []
    for i in range(loops):
        habit_name = f"Stress Habit {worker_index}-{i}-{uuid4().hex[:5]}"
        create = req("POST", "/habits/", headers=headers, json={
            "name": habit_name,
            "category": "Health",
            "target": "Daily",
            "frequency": "daily",
        })
        if create["ok"]:
            # Fetch created habit id from a normal request to avoid parsing body_sample.
            r = session.get(base_url.rstrip("/") + "/habits/", headers=headers, timeout=20)
            results.append({
                "endpoint": "/habits/ list-helper",
                "method": "GET",
                "status": r.status_code,
                "latency_ms": 0,
                "ok": r.ok,
                "error": "",
                "body_sample": "habit id helper",
            })
            if r.ok:
                for h in r.json():
                    if h["name"] == habit_name:
                        habit_ids.append(h["id"])
                        break

    today = date.today()
    for habit_id in habit_ids:
        for d_offset in range(7):
            d = (today - timedelta(days=d_offset)).isoformat()
            req("POST", "/habits/logs", headers=headers, json={
                "habit_id": habit_id,
                "progress": 100 if d_offset % 2 == 0 else 40,
                "date": d,
            })

    req("POST", "/checkins", headers=headers, json={
        "date": today.isoformat(),
        "mood": "Good",
        "energy": "Moderate",
        "had_urges": False,
        "difficult": "",
        "note": "stress run",
        "completed": True,
    })
    req("GET", "/habits/logs", headers=headers)
    req("GET", "/nudges/today", headers=headers)
    req("POST", "/notifications/generate", headers=headers)
    req("GET", "/notifications/pending", headers=headers)
    req("GET", "/predictions/lapse-risk", headers=headers)
    req("GET", "/export/data", headers=headers)

    return results


def summarize(results):
    by_endpoint = {}
    for row in results:
        by_endpoint.setdefault(row["endpoint"], []).append(row)

    summary = {
        "total_requests": len(results),
        "successful_requests": sum(1 for r in results if r["ok"]),
        "failed_requests": sum(1 for r in results if not r["ok"]),
        "endpoints": {},
    }

    for endpoint, rows in sorted(by_endpoint.items()):
        latencies = [r["latency_ms"] for r in rows if r["latency_ms"] > 0]
        statuses = {}
        for r in rows:
            statuses[str(r["status"])] = statuses.get(str(r["status"]), 0) + 1
        if latencies:
            p95 = statistics.quantiles(latencies, n=20)[-1] if len(latencies) >= 20 else max(latencies)
            summary["endpoints"][endpoint] = {
                "count": len(rows),
                "ok": sum(1 for r in rows if r["ok"]),
                "failed": sum(1 for r in rows if not r["ok"]),
                "status_counts": statuses,
                "avg_ms": round(statistics.mean(latencies), 2),
                "p50_ms": round(statistics.median(latencies), 2),
                "p95_ms": round(p95, 2),
                "max_ms": round(max(latencies), 2),
            }
        else:
            summary["endpoints"][endpoint] = {
                "count": len(rows),
                "ok": sum(1 for r in rows if r["ok"]),
                "failed": sum(1 for r in rows if not r["ok"]),
                "status_counts": statuses,
                "avg_ms": 0,
                "p50_ms": 0,
                "p95_ms": 0,
                "max_ms": 0,
            }
    return summary


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://127.0.0.1:8000")
    parser.add_argument("--users", type=int, default=25)
    parser.add_argument("--concurrency", type=int, default=10)
    parser.add_argument("--loops", type=int, default=3, help="habits created per user")
    args = parser.parse_args()

    all_results = []
    started = time.perf_counter()

    with ThreadPoolExecutor(max_workers=args.concurrency) as executor:
        futures = [executor.submit(run_user_workflow, args.base_url, i, args.loops) for i in range(args.users)]
        for future in as_completed(futures):
            all_results.extend(future.result())

    elapsed = time.perf_counter() - started
    summary = summarize(all_results)
    summary["config"] = vars(args)
    summary["elapsed_seconds"] = round(elapsed, 2)
    summary["requests_per_second"] = round(len(all_results) / elapsed, 2) if elapsed else 0

    csv_path = REPORT_DIR / "stress_results.csv"
    json_path = REPORT_DIR / "stress_summary.json"

    with csv_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["endpoint", "method", "status", "latency_ms", "ok", "error", "body_sample"])
        writer.writeheader()
        writer.writerows(all_results)

    json_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")

    print(json.dumps(summary, indent=2))
    print(f"\nSaved: {csv_path}")
    print(f"Saved: {json_path}")


if __name__ == "__main__":
    main()

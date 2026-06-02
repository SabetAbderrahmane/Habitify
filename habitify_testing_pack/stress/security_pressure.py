#!/usr/bin/env python3
"""
Invalid-login pressure smoke test.

This is for your local Habitify backend. It checks rejection consistency and exposes missing rate limiting.
"""

from __future__ import annotations

import argparse
import json
import statistics
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from uuid import uuid4

import requests

REPORT_DIR = Path(__file__).resolve().parents[1] / "reports"
REPORT_DIR.mkdir(parents=True, exist_ok=True)


def attempt(base_url, index):
    email = f"invalid_{index}_{uuid4().hex[:8]}@example.com"
    start = time.perf_counter()
    error = ""
    status = 0
    try:
        r = requests.post(base_url.rstrip("/") + "/login", json={"email": email, "password": "wrong-password"}, timeout=15)
        status = r.status_code
    except Exception as exc:
        error = repr(exc)
    latency_ms = (time.perf_counter() - start) * 1000
    return {"status": status, "latency_ms": round(latency_ms, 2), "error": error}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://127.0.0.1:8000")
    parser.add_argument("--attempts", type=int, default=100)
    parser.add_argument("--concurrency", type=int, default=20)
    args = parser.parse_args()

    rows = []
    started = time.perf_counter()
    with ThreadPoolExecutor(max_workers=args.concurrency) as executor:
        futures = [executor.submit(attempt, args.base_url, i) for i in range(args.attempts)]
        for f in as_completed(futures):
            rows.append(f.result())
    elapsed = time.perf_counter() - started

    statuses = {}
    for row in rows:
        statuses[str(row["status"])] = statuses.get(str(row["status"]), 0) + 1

    latencies = [r["latency_ms"] for r in rows if r["latency_ms"] > 0]
    summary = {
        "test": "invalid_login_pressure",
        "attempts": args.attempts,
        "concurrency": args.concurrency,
        "elapsed_seconds": round(elapsed, 2),
        "requests_per_second": round(args.attempts / elapsed, 2) if elapsed else 0,
        "status_counts": statuses,
        "avg_ms": round(statistics.mean(latencies), 2) if latencies else 0,
        "p50_ms": round(statistics.median(latencies), 2) if latencies else 0,
        "max_ms": round(max(latencies), 2) if latencies else 0,
        "security_interpretation": (
            "Expected behavior: every invalid login should be rejected with 400. "
            "If there are no 429 responses, the app currently has no visible rate limiting. "
            "That is acceptable for a thesis prototype only if documented as a limitation."
        ),
    }

    out = REPORT_DIR / "security_pressure_summary.json"
    out.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(json.dumps(summary, indent=2))
    print(f"\nSaved: {out}")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
from __future__ import annotations

import csv
from collections import Counter, defaultdict
from pathlib import Path

import matplotlib.pyplot as plt

ROOT = Path(__file__).resolve().parents[1]
REPORTS = ROOT / "reports"
CSV_PATH = REPORTS / "stress_results.csv"
CHART_DIR = REPORTS / "charts"
CHART_DIR.mkdir(parents=True, exist_ok=True)


def read_rows():
    if not CSV_PATH.exists():
        raise SystemExit(f"Missing {CSV_PATH}. Run stress/stress_api.py first.")
    with CSV_PATH.open("r", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def latency_by_endpoint(rows):
    values = defaultdict(list)
    for row in rows:
        try:
            latency = float(row["latency_ms"])
        except Exception:
            continue
        if latency > 0:
            values[row["endpoint"]].append(latency)

    endpoints = []
    avgs = []
    for endpoint, latencies in values.items():
        endpoints.append(endpoint)
        avgs.append(sum(latencies) / len(latencies))

    order = sorted(range(len(endpoints)), key=lambda i: avgs[i], reverse=True)
    endpoints = [endpoints[i] for i in order]
    avgs = [avgs[i] for i in order]

    plt.figure(figsize=(12, max(5, len(endpoints) * 0.45)))
    plt.barh(endpoints, avgs)
    plt.xlabel("Average latency (ms)")
    plt.ylabel("Endpoint")
    plt.title("Habitify API Average Latency by Endpoint")
    plt.tight_layout()
    out = CHART_DIR / "latency_by_endpoint.png"
    plt.savefig(out, dpi=180)
    plt.close()
    return out


def status_distribution(rows):
    counts = Counter(row["status"] for row in rows)
    labels = list(counts.keys())
    sizes = [counts[k] for k in labels]

    plt.figure(figsize=(7, 7))
    plt.pie(sizes, labels=labels, autopct="%1.1f%%")
    plt.title("Habitify API Status Code Distribution")
    plt.tight_layout()
    out = CHART_DIR / "status_distribution.png"
    plt.savefig(out, dpi=180)
    plt.close()
    return out


def main():
    rows = read_rows()
    outputs = [latency_by_endpoint(rows), status_distribution(rows)]
    for out in outputs:
        print(f"Saved: {out}")


if __name__ == "__main__":
    main()

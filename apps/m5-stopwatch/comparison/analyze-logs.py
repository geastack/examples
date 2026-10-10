#!/usr/bin/env python3
"""Summarize SWBENCH JSON from saved serial logs; never access a device."""
import argparse
from collections import defaultdict
import json
from pathlib import Path
from statistics import median


def read_samples(paths):
    samples = []
    for path in paths:
        for line_number, line in enumerate(path.read_text(errors="replace").splitlines(), 1):
            if "SWBENCH " in line:
                payload = line.split("SWBENCH ", 1)[1]
            elif "SWBENCHJSON " in line:
                payload = line.split("SWBENCHJSON ", 1)[1]
            elif path.suffix == ".jsonl" and line.strip():
                payload = line
            else:
                continue
            sample = json.loads(payload)
            if sample.get("schema_version") != 1:
                raise ValueError(f"unsupported schema in {path}:{line_number}")
            if sample.get("phase") != "end":
                continue
            if sample.get("framework") not in ("factory", "gea") or sample.get("window_us", 0) <= 0:
                raise ValueError(f"invalid framework/window in {path}:{line_number}")
            sample["source"] = {"path": str(path.resolve()), "line": line_number}
            samples.append(sample)
    return samples


def metrics(sample):
    window = sample["window_us"]
    count = sample["scheduler_frames"]
    result = {"window_seconds": window / 1e6, "scheduler_fps": count * 1e6 / window,
              "rendered_fps": sample["rendered_frames"] * 1e6 / window,
              "presented_fps": None if sample.get("presented_frames") is None else sample["presented_frames"] * 1e6 / window,
              "work_mean_us": sample["work_us"] / count if count else None,
              "work_max_us": sample["work_max_us"],
              "wall_work_fraction_percent": sample["work_us"] * 100 / window,
              "transfer_pixels_per_second": sample["present_pixels"] * 1e6 / window}
    for prefix in ("cadence", "presented_cadence"):
        count = sample.get(prefix + "_count", 0)
        result[prefix + "_mean_us"] = sample.get(prefix + "_sum_us", 0) / count if count else None
        result[prefix + "_max_us"] = sample.get(prefix + "_max_us") if count else None
        upper = sample.get(prefix + "_p99_upper_us")
        result[prefix + "_p99_upper_us"] = upper if upper is not None and upper >= 0 else None
    for region in ("internal", "psram"):
        heap = sample[region]
        result[region + "_used_bytes"] = heap["total_bytes"] - heap["free_bytes"]
        for key in ("free_bytes", "min_free_bytes", "largest_free_bytes"):
            result[region + "_" + key] = heap[key]
    return result


def summarize(samples):
    groups = defaultdict(list)
    records = []
    seen = set()
    for sample in samples:
        variant = sample.get("variant", "refresh" + str(sample["refresh_ms"]) if "refresh_ms" in sample else "unspecified")
        optimization = sample.get("optimization", "unspecified")
        identity = (sample["framework"], variant, optimization, sample["run_id"], sample["scenario"])
        if identity in seen:
            raise ValueError("duplicate run identity: " + repr(identity))
        seen.add(identity)
        measured = metrics(sample)
        records.append({"sample": sample, "metrics": measured})
        groups[(sample["framework"], variant, optimization, sample["scenario"])].append(measured)
    summaries = []
    for (framework, variant, optimization, scenario), repetitions in sorted(groups.items()):
        values = {}
        for key in repetitions[0]:
            valid = [r[key] for r in repetitions if r[key] is not None]
            values[key] = {"n": len(valid), "median": median(valid), "min": min(valid), "max": max(valid)} if valid else None
        summaries.append({"framework": framework, "variant": variant, "optimization": optimization, "scenario": scenario,
                          "repetitions": len(repetitions), "metrics": values})
    return {"schema_version": 1, "runs": records, "summary": summaries,
            "notes": ["Presented FPS counts upload frames, not panel scan rate.",
                      "Scheduler rates differ by framework and are not visual FPS.",
                      "Compiler optimization and refresh variants are grouped separately.",
                      "Wall work fraction includes blocking and is not CPU utilization.",
                      "Heap minimum is boot lifetime unless each sample explicitly states otherwise.",
                      "Use all repetitions; missing metrics remain unavailable, never zero."]}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("logs", nargs="+", type=Path)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    text = json.dumps(summarize(read_samples(args.logs)), indent=2) + "\n"
    if args.output:
        args.output.write_text(text)
    else:
        print(text, end="")


if __name__ == "__main__":
    main()

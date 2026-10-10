#!/usr/bin/env python3
"""Rebuild retained factory variants in the single normal build directory."""

import argparse
import os
import shutil
import subprocess
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--optimization", choices=["Og", "O2"], required=True)
parser.add_argument("--diagnostic", action="store_true")
parser.add_argument(
    "--capture",
    action="store_true",
    help="Capture-only telemetry variant; implies diagnostic",
)
parser.add_argument("--idf", type=Path, default=Path.home() / "esp32/esp-idf-v5.5.4")
args = parser.parse_args()
if args.capture:
    args.diagnostic = True
root = Path(__file__).resolve().parents[4]
source = root / "vendored-sources/M5StopWatch-UserDemo"
patch = Path(__file__).with_name("factory-diagnostics.patch")
if (
    subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=source, text=True).strip()
    != "6b4aa125288b6fe9dca661f10159f6e1e5ee785c"
):
    raise RuntimeError("Reference checkout does not match pinned source")


def git_apply(*flags):
    return subprocess.run(
        ["git", "apply", *flags, str(patch)],
        cwd=source,
        capture_output=True,
        check=False,
    )


applied = git_apply("--reverse", "--check").returncode == 0
if not applied and git_apply("--check").returncode != 0:
    raise RuntimeError(
        "Reference hooks differ from the recorded patch; refusing to overwrite"
    )
removed = False
if args.diagnostic and not applied:
    git_apply().check_returncode()
elif not args.diagnostic and applied:
    git_apply("--reverse").check_returncode()
    removed = True
try:
    baseline = (source / "build/sdkconfig.production").read_text()
    if args.optimization == "O2":
        baseline = baseline.replace(
            "CONFIG_COMPILER_OPTIMIZATION_DEBUG=y",
            "# CONFIG_COMPILER_OPTIMIZATION_DEBUG is not set",
        )
        baseline = baseline.replace(
            "# CONFIG_COMPILER_OPTIMIZATION_PERF is not set",
            "CONFIG_COMPILER_OPTIMIZATION_PERF=y",
        )
    (source / "sdkconfig").write_text(baseline)
    label = f"{'capture' if args.capture else 'diagnostic' if args.diagnostic else 'production'}-{args.optimization}"
    log = source / "build" / f"{label}-build.log"
    environment = os.environ.copy()
    environment["TMPDIR"] = str(source / "build")
    environment["IDF_PYTHON_ENV_PATH"] = str(
        Path.home() / ".espressif/python_env/idf5.5_py3.9_env"
    )
    environment["FACTORY_IDF_EXPORT"] = str(args.idf / "export.sh")
    # Shell text contains no interpolated paths or user command strings.
    script = (
        'source "$FACTORY_IDF_EXPORT" >/dev/null; idf.py -DFACTORY_COMPARISON='
        + ("ON" if args.diagnostic else "OFF")
        + " -DFACTORY_CAPTURE="
        + ("ON" if args.capture else "OFF")
        + " reconfigure && ninja -C build -j2"
    )
    with log.open("w") as output:
        subprocess.run(
            ["bash", "-c", script],
            cwd=source,
            env=environment,
            stdout=output,
            stderr=subprocess.STDOUT,
            check=True,
        )
    for extension in ["bin", "elf", "map"]:
        shutil.copy2(
            source / f"build/StopWatch-UserDemo.{extension}",
            source / f"build/StopWatch-UserDemo-{label}.{extension}",
        )
    for file in ["sdkconfig", "build/build.ninja", "build/project_description.json"]:
        path = source / file
        shutil.copy2(path, source / "build" / f"{label}-{path.name}")
    print(label, (source / f"build/StopWatch-UserDemo-{label}.bin").stat().st_size)
finally:
    if removed:
        git_apply().check_returncode()

#!/usr/bin/env bash
# Launch an app binary, let it settle, then report the memory of the app process
# plus any helper processes it spawned (WebKit XPC services for Tauri).
# phys_footprint is what Activity Monitor's "Memory" column shows; RSS includes
# shared framework pages and so over-counts what the app really costs.
# Usage: measure.sh <label> <executable> [settle-seconds]
set -euo pipefail
label="$1"; exe="$2"; settle="${3:-6}"

helpers() { pgrep -f 'com\.apple\.WebKit\.(WebContent|Networking|GPU)' | sort || true; }
before="$(helpers)"
"$exe" >/dev/null 2>&1 &
pid=$!
sleep "$settle"
after="$(helpers)"
new="$(comm -13 <(echo "$before") <(echo "$after") | grep . || true)"

fp() { footprint -p "$1" 2>/dev/null | awk '/phys_footprint:/ {print $2, $3; exit}'; }
rss() { ps -o rss= -p "$1" | awk '{printf "%.1f MB", $1/1024}'; }
tomb() { awk '{v=$1; u=$2; if (u=="KB") v/=1024; else if (u=="GB") v*=1024; printf "%.1f", v}'; }

total=0
printf '%s\n' "$label"
for p in $pid $new; do
  name="$(ps -o comm= -p "$p")"; name="${name##*/}"
  f="$(fp "$p" | tomb)"
  total="$(echo "$total + $f" | bc)"
  printf '  %-32s pid %-6s footprint %7s MB   rss %s\n' "$name" "$p" "$f" "$(rss "$p")"
done
printf '  TOTAL footprint %s MB\n' "$total"
kill "$pid" 2>/dev/null || true
wait "$pid" 2>/dev/null || true

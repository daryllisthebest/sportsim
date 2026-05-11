#!/usr/bin/env bash
# Wrapper called by cron. Logs to scripts/sync.log.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$SCRIPT_DIR/sync.log"

cd "$PROJECT_DIR"

# Keep last 5 000 lines of log to avoid unbounded growth
if [ -f "$LOG_FILE" ] && [ "$(wc -l < "$LOG_FILE")" -gt 5000 ]; then
  tail -n 4000 "$LOG_FILE" > "$LOG_FILE.tmp" && mv "$LOG_FILE.tmp" "$LOG_FILE"
fi

echo "──────────────────────────────────────" >> "$LOG_FILE"
echo "cron run: $(date -u '+%Y-%m-%dT%H:%M:%SZ')" >> "$LOG_FILE"

npm run sync >> "$LOG_FILE" 2>&1 && echo "exit: 0" >> "$LOG_FILE" || echo "exit: $?" >> "$LOG_FILE"

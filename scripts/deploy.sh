#!/usr/bin/env bash
# Deploys the Sales CRM golden demo to a target instance.
#
# Usage: scripts/deploy.sh <mcp-instance-name>
#
# <mcp-instance-name> is the MCP server name registered for the target instance
# (e.g. opmsalescrmstage, opmsalescrmgd) — same name used in tool calls like
# mcp__<name>__snow_read.
set -euo pipefail

INSTANCE="${1:-}"
if [[ -z "$INSTANCE" ]]; then
  echo "Usage: $0 <mcp-instance-name>" >&2
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UPDATE_SETS_DIR="$REPO_ROOT/update-sets"
SEED_DIR="$REPO_ROOT/seed"
POST_DEPLOY_DIR="$REPO_ROOT/scripts/post-deploy"

echo "== Sales CRM Golden Demo Deploy =="
echo "Target instance (MCP name): $INSTANCE"
echo

echo "-- Step 1: Update Sets --"
shopt -s nullglob
xml_files=("$UPDATE_SETS_DIR"/UPDATE-*.xml)
if [[ ${#xml_files[@]} -eq 0 ]]; then
  echo "No Update Set XML files found in $UPDATE_SETS_DIR — nothing to import yet."
else
  echo "Found ${#xml_files[@]} Update Set file(s) to import, in order:"
  for f in "${xml_files[@]}"; do
    echo "  - $(basename "$f")"
  done
  echo
  echo "MANUAL STEP (no scripted remote update-set import yet):"
  echo "  1. On the target instance, go to Retrieved Update Sets."
  echo "  2. Import each XML file above, in listed order."
  echo "  3. Preview and Commit each one before importing the next."
  echo "  (Automating this via the Import/Export API is a future improvement —"
  echo "   see README for current limitations.)"
fi
echo

echo "-- Step 2: Seed data --"
seed_files=("$SEED_DIR"/[0-9]*.js)
if [[ ${#seed_files[@]} -eq 0 ]]; then
  echo "No seed scripts found in $SEED_DIR yet — seed/ is currently a placeholder."
  echo "Demo data seeding will be added once the config baseline is captured."
else
  echo "Found ${#seed_files[@]} seed script(s) to run, in order:"
  for f in "${seed_files[@]}"; do
    echo "  - $(basename "$f")"
  done
  echo
  echo "Run each with the execute MCP tool against $INSTANCE, in listed order."
  echo "(Scripted end-to-end invocation to be added once seed/ is populated.)"
fi
echo

echo "-- Step 3: Post-deploy config --"
post_files=("$POST_DEPLOY_DIR"/[0-9]*.js)
if [[ ${#post_files[@]} -eq 0 ]]; then
  echo "No post-deploy scripts found in $POST_DEPLOY_DIR."
else
  echo "Found ${#post_files[@]} post-deploy script(s) to run, in order:"
  for f in "${post_files[@]}"; do
    echo "  - $(basename "$f")"
  done
  echo
  echo "Run each with the execute MCP tool against $INSTANCE, after the Update Sets are committed."
  echo "These set config by name where an Update Set can't (per-instance sys_ids, private properties)."
fi
echo

echo "== Deploy steps printed above. No changes have been made by this script. =="

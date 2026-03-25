#!/bin/bash
# Ralph Loop for second-opinion-mcp
# Runs Claude Code iterations, one story at a time, fresh context each round.
# Uses node for JSON parsing (no jq dependency).

set -e

MAX_ITER=${1:-10}
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
PRD_FILE="$PROJECT_DIR/prd.json"
COUNT=0

echo "========================================"
echo " Ralph Loop: second-opinion-mcp"
echo " Max iterations: $MAX_ITER"
echo " Project: $PROJECT_DIR"
echo "========================================"
echo ""

while [ $COUNT -lt $MAX_ITER ]; do
    COUNT=$((COUNT + 1))

    # Count remaining stories using node
    REMAINING=$(node -e "
        const prd = JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8'));
        console.log(prd.stories.filter(s => !s.passes).length);
    " "$PRD_FILE")

    if [ "$REMAINING" = "0" ]; then
        echo ""
        echo "========================================"
        echo " ALL STORIES COMPLETE"
        echo "========================================"
        break
    fi

    NEXT_STORY=$(node -e "
        const prd = JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8'));
        const next = prd.stories.find(s => !s.passes);
        console.log(next.id + ': ' + next.title);
    " "$PRD_FILE")

    echo "--- Iteration $COUNT/$MAX_ITER ---"
    echo "Story: $NEXT_STORY"
    echo "Remaining: $REMAINING stories"
    echo "---"

    cd "$PROJECT_DIR"
    claude --dangerously-skip-permissions \
        -p "You are inside a Ralph Loop iteration. Read CLAUDE.md for full project context and coding rules. Read prd.json to find the next story where passes is false. Implement ONLY that story. Run npm run build to verify. If build passes: git commit with message 'feat(story-N): title', update prd.json setting passes to true, append learnings to progress.txt. Then exit."

    echo ""
    echo "--- Iteration $COUNT done ---"
    echo ""

    sleep 3
done

echo ""
echo "========================================"
echo " Ralph Loop finished: $COUNT iterations"
echo "========================================"

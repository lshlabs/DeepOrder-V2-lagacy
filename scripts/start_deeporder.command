#!/bin/bash

osascript <<'EOF'
tell application "Terminal"
    activate

    do script "cd /Users/mac/Documents/DeepOrder_V2/deeporder-backend
    source .venv/bin/activate
    uvicorn app.main:app --host 127.0.0.1 --port 8000"

    delay 0.5

    tell application "System Events"
        keystroke "t" using command down
    end tell
    delay 0.5
    do script "cd /Users/mac/Documents/DeepOrder_V2/mock-delivery-api
    source .venv/bin/activate
    uvicorn app.main:app --host 127.0.0.1 --port 8001" in selected tab of front window

    delay 0.5

    tell application "System Events"
        keystroke "t" using command down
    end tell
    delay 0.5
    do script "cd /Users/mac/Documents/DeepOrder_V2
    npm --workspace kds-web run dev -- --host 127.0.0.1 --port 5173" in selected tab of front window
end tell
EOF
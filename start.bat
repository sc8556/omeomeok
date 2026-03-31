@echo off
echo Starting backend...
start cmd /k "cd /d C:\Users\sc855\Desktop\omeomeok\backend && .venv\Scripts\activate && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

timeout /t 3 /nobreak > nul

echo Starting frontend...
start cmd /k "cd /d C:\Users\sc855\Desktop\omeomeok\frontend && npx expo start --tunnel --clear"

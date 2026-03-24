@echo off
echo ================================================
echo  오늘 뭐 먹지 - 개발 서버 시작
echo ================================================
echo.
echo [1] 로컬 (같은 Wi-Fi 필요)
echo [2] ngrok 터널 (어디서든 접속 가능)
echo.
set /p MODE="선택 (1 또는 2): "

echo Starting backend...
start cmd /k "cd /d C:\Users\sc855\Desktop\omeomeok\backend && .venv\Scripts\activate && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

timeout /t 3 /nobreak > nul

if "%MODE%"=="2" (
    echo Starting ngrok tunnel...
    start cmd /k "ngrok http 8000"
    echo.
    echo !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    echo  ngrok 창에서 https://xxxx.ngrok-free.app URL 확인 후
    echo  frontend/.env 파일의 EXPO_PUBLIC_API_URL 값을 해당 URL로 변경하세요.
    echo  변경 후 프론트엔드를 다시 시작하세요.
    echo !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    echo.
    pause
)

echo Starting frontend...
start cmd /k "cd /d C:\Users\sc855\Desktop\omeomeok\frontend && npx expo start --clear"

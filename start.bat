@echo off
echo ======================================================
echo    Particle Physics Simulation with OpenAI Assistant
echo ======================================================
echo.

echo Checking environment...
if not exist "%~dp0.env" (
  echo ERROR: .env file not found!
  echo Please create a .env file with your OpenAI API keys.
  echo Example:
  echo.
  echo OPENAI_API_KEY=your_api_key_here
  echo OPENAI_ASSISTANT_MODEL=your_assistant_id_here
  echo PORT=3000
  echo NODE_ENV=development
  echo.
  echo Press any key to exit...
  pause > nul
  exit /b 1
) else (
  echo .env file found successfully!
  echo Checking OpenAI API configuration...
)
)

echo Installing dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
  echo Error installing dependencies! Please check your npm installation.
  pause
  exit /b 1
)

echo.
echo Starting the OpenAI API proxy server...
start "API Server" cmd /k npm run server

echo.
echo Starting the Vue development server...
start "Vue Dev Server" cmd /k npm run dev

echo.
echo ======================================================
echo Setup complete! 
echo.
echo API Server is running on port 3000
echo Vue app should open in your browser shortly
echo.
echo NOTE: To stop the servers, close both terminal windows
echo.
echo TROUBLESHOOTING:
echo - If you see OpenAI API errors, check your API key in .env
echo - For v2 API errors, ensure your assistant ID is configured for v2
echo - API server logs are visible in the API Server window
echo ======================================================
echo.
echo Press any key to exit this setup script...
pause > nul

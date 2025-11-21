@echo off
REM Quick setup script for Windows

echo.
echo 🚀 Setting up Personal Dashboard...
echo.

REM Check if Docker is installed
docker --version >nul 2>&1
if %errorlevel% == 0 (
    set DOCKER_AVAILABLE=true
    echo ✅ Docker detected
) else (
    set DOCKER_AVAILABLE=false
    echo ⚠️ Docker not detected
)

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% == 0 (
    set NODE_AVAILABLE=true
    for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
    echo ✅ Node.js detected (!NODE_VERSION!)
) else (
    set NODE_AVAILABLE=false
    echo ⚠️ Node.js not detected
)

echo.

REM Determine setup method
if "%DOCKER_AVAILABLE%"=="true" if "%NODE_AVAILABLE%"=="true" (
    echo Choose setup method:
    echo 1^) Docker ^(recommended for consistency^)
    echo 2^) Local ^(faster hot reload^)
    set /p CHOICE="Enter choice (1 or 2): "
) else if "%DOCKER_AVAILABLE%"=="true" (
    set CHOICE=1
    echo Using Docker ^(Node.js not installed^)
) else if "%NODE_AVAILABLE%"=="true" (
    set CHOICE=2
    echo Using local setup ^(Docker not installed^)
) else (
    echo ❌ Error: Neither Docker nor Node.js is installed!
    echo Please install one of:
    echo   - Docker Desktop: https://www.docker.com/products/docker-desktop
    echo   - Node.js 18+: https://nodejs.org/
    pause
    exit /b 1
)

echo.

REM Setup environment file
if not exist .env.local (
    echo 📝 Creating .env.local from template...
    copy .env.example .env.local >nul
    echo ✅ Created .env.local ^(edit this file to add your API keys^)
    echo.
)

REM Run setup based on choice
if "%CHOICE%"=="1" (
    echo 🐳 Setting up with Docker...
    echo.

    echo Building Docker image ^(this may take a few minutes^)...
    docker-compose build

    echo.
    echo Starting containers...
    docker-compose up -d

    echo.
    echo ✅ Setup complete!
    echo.
    echo 📱 Dashboard running at: http://localhost:3000
    echo.
    echo Useful commands:
    echo   docker-compose logs -f app    # View logs
    echo   docker-compose restart        # Restart
    echo   docker-compose down           # Stop

) else (
    echo 💻 Setting up locally...
    echo.

    echo Installing dependencies...
    call npm install

    echo.
    echo ✅ Setup complete!
    echo.
    echo Start development server:
    echo   npm run dev
    echo.
    echo Then open: http://localhost:3000
)

echo.
echo 📖 Read README.md for more information
echo 🐳 Read DOCKER_GUIDE.md for Docker details
echo.
echo Happy coding! 🎉
echo.
pause

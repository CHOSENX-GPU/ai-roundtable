@echo off
REM AI Roundtable - Build Script for Windows
REM This script creates a clean distribution package

echo 📦 Building AI Roundtable...

REM Read version from manifest.json
for /f "tokens=2 delims=:," %%a in ('findstr /C:"\"version\"" manifest.json') do (
    set VERSION_LINE=%%a
    goto :found_version
)
:found_version
set VERSION=%VERSION_LINE:" "=%
set VERSION=%VERSION_LINE:"=%
set VERSION=%VERSION:,=%

set DIST_NAME=ai-roundtable-v%VERSION%
set DIST_DIR=dist
set DIST_FILE=%DIST_DIR%\%DIST_NAME%.zip

echo Version: %VERSION%

REM Clean previous builds
if exist "%DIST_DIR%" rmdir /s /q "%DIST_DIR%"
mkdir "%DIST_DIR%"

REM Create temporary directory for packaging
set TEMP_DIR=%DIST_DIR%\%DIST_NAME%
mkdir "%TEMP_DIR%"

REM Copy necessary files
echo 📋 Copying files...
copy manifest.json "%TEMP_DIR%\" >nul
copy background.js "%TEMP_DIR%\" >nul
copy README.md "%TEMP_DIR%\" >nul
if exist LICENSE copy LICENSE "%TEMP_DIR%\" >nul

REM Copy directories
xcopy /E /I /Q sidepanel "%TEMP_DIR%\sidepanel" >nul
xcopy /E /I /Q content "%TEMP_DIR%\content" >nul
if exist icons xcopy /E /I /Q icons "%TEMP_DIR%\icons" >nul

REM Remove development files from the package
echo 🧹 Cleaning development files...
del "%TEMP_DIR%\CLAUDE.md" 2>nul
del "%TEMP_DIR%\DEVELOPMENT_LOG.md" 2>nul
del "%TEMP_DIR%\SOFTWARE_DESIGN.md" 2>nul
del "%TEMP_DIR%\TESTING.md" 2>nul
del "%TEMP_DIR%\package.sh" 2>nul
del "%TEMP_DIR%\build.bat" 2>nul
if exist "%TEMP_DIR%\docs" rmdir /s /q "%TEMP_DIR%\docs" 2>nul
if exist "%TEMP_DIR%\.git" rmdir /s /q "%TEMP_DIR%\.git" 2>nul
del "%TEMP_DIR%\.gitignore" 2>nul

REM Create ZIP file using PowerShell
echo 📫 Creating ZIP package...
powershell -Command "Compress-Archive -Path '%TEMP_DIR%' -DestinationPath '%DIST_FILE%' -Force"

REM Cleanup
rmdir /s /q "%TEMP_DIR%"

echo.
echo ✅ Package created successfully!
echo 📦 Location: %DIST_FILE%
echo.
echo 🚀 You can now distribute this file for users to install.
echo    Installation: Unzip and load unpacked extension in Chrome

pause

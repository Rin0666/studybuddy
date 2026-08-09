@echo off
setlocal

cd /d "%~dp0"

where git >nul 2>&1
if errorlevel 1 (
  echo.
  echo Git is required but was not found on PATH.
  echo Install Git for Windows and try again.
  echo.
  pause
  exit /b 1
)

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo.
  echo This script is not inside a Git repository.
  echo.
  pause
  exit /b 1
)

for /f "delims=" %%B in ('git branch --show-current') do set "CURRENT_BRANCH=%%B"
if not defined CURRENT_BRANCH (
  echo.
  echo Git is in detached HEAD state. Check out a branch before pushing.
  echo.
  pause
  exit /b 1
)

echo.
echo Current branch: %CURRENT_BRANCH%
echo.
echo Changes to be included:
git status --short
echo.

set "COMMIT_MESSAGE="
set /p "COMMIT_MESSAGE=Enter commit message: "
if not defined COMMIT_MESSAGE (
  echo.
  echo A commit message is required. Nothing was changed.
  pause
  exit /b 1
)

git add -A
if errorlevel 1 goto :failed

git diff --cached --quiet
if errorlevel 2 goto :failed
if not errorlevel 1 (
  echo.
  echo There are no changes to commit.
  pause
  exit /b 0
)

git commit -m "%COMMIT_MESSAGE%"
if errorlevel 1 goto :failed

git rev-parse --abbrev-ref --symbolic-full-name "@{u}" >nul 2>&1
if errorlevel 1 (
  echo.
  echo No upstream branch found. Pushing to origin/%CURRENT_BRANCH%...
  git push -u origin "%CURRENT_BRANCH%"
) else (
  echo.
  echo Pushing %CURRENT_BRANCH%...
  git push
)

if errorlevel 1 goto :failed

echo.
echo Commit pushed successfully.
pause
exit /b 0

:failed
echo.
echo Git operation failed. Review the message above; your files were not deleted.
pause
exit /b 1

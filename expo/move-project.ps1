# Script to move project to shorter path and build APK
# This resolves the Windows 260 character path limit issue

$newPath = "C:\rork"
$currentPath = "C:\Users\Administrator\Git files\rork-my-notebooks-custom-themes-3"

Write-Host "Moving project from:" -ForegroundColor Yellow
Write-Host "  $currentPath"
Write-Host "To:" -ForegroundColor Yellow
Write-Host "  $newPath"
Write-Host ""

if (Test-Path $newPath) {
    Write-Host "Error: $newPath already exists!" -ForegroundColor Red
    Write-Host "Please delete or rename it first, then run this script again."
    exit 1
}

Write-Host "Creating directory and moving files..." -ForegroundColor Cyan
Move-Item -Path $currentPath -Destination $newPath

Write-Host "Project moved successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Now building APK..." -ForegroundColor Cyan
Write-Host ""

# Set JAVA_HOME and build
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.0.13.11-hotspot"
Set-Location $newPath\android
.\gradlew.bat assembleRelease

Write-Host ""
Write-Host "Build complete! APK location:" -ForegroundColor Green
Write-Host "  $newPath\android\app\build\outputs\apk\release\app-release.apk"

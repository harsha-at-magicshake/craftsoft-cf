# ============================================
# Build Admin CSS Bundle
# ============================================
# Run this script after making changes to any CSS file
# It combines all CSS files into admin-bundled.css
#
# Usage: Right-click this file > "Run with PowerShell"
#        Or run: .\build-admin-css.ps1
# ============================================

$ErrorActionPreference = "Stop"

# Get the script's directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Split-Path -Parent (Split-Path -Parent $scriptDir)

Write-Host "Building admin-bundled.css..." -ForegroundColor Cyan

# Define file order (important for CSS cascade)
$cssFiles = @(
    "$rootDir\assets\css\base\variables.css",
    "$scriptDir\base\variables.css",
    "$scriptDir\base\reset.css",
    "$scriptDir\base\typography.css",
    "$scriptDir\layout\auth.css",
    "$scriptDir\layout\dashboard.css",
    "$scriptDir\layout\header.css",
    "$scriptDir\layout\sidebar.css",
    "$scriptDir\components\buttons.css",
    "$scriptDir\components\forms.css",
    "$scriptDir\components\modals.css",
    "$scriptDir\components\toasts.css",
    "$scriptDir\components\tables.css",
    "$scriptDir\components\cards.css",
    "$scriptDir\components\badges.css",
    "$scriptDir\components\account-panel.css",
    "$scriptDir\utilities\skeleton.css",
    "$scriptDir\utilities\helpers.css",
    "$scriptDir\responsive\tablet.css",
    "$scriptDir\responsive\mobile.css"
)

# Output file
$outputFile = "$scriptDir\admin-bundled.css"

# Combine all files
$content = ""
foreach ($file in $cssFiles) {
    if (Test-Path $file) {
        $fileName = Split-Path -Leaf $file
        $content += "/* ========== $fileName ========== */`n"
        $content += (Get-Content $file -Raw)
        $content += "`n`n"
        Write-Host "  + $fileName" -ForegroundColor Green
    } else {
        Write-Host "  ! Missing: $file" -ForegroundColor Yellow
    }
}

# Write to output
$content | Out-File -FilePath $outputFile -Encoding utf8

$size = [math]::Round((Get-Item $outputFile).Length / 1024, 1)
Write-Host "`nDone! admin-bundled.css ($size KB)" -ForegroundColor Cyan
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

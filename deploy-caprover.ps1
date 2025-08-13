# CapRover Deployment Script for Loan Comparison Tool
# PowerShell version for Windows

param(
    [string]$AppName = "loan-comparison-tool",
    [string]$Branch = "main",
    [switch]$FirstDeploy,
    [switch]$Help
)

if ($Help) {
    Write-Host "CapRover Deployment Script for Loan Comparison Tool" -ForegroundColor Green
    Write-Host ""
    Write-Host "Usage:"
    Write-Host "  .\deploy-caprover.ps1 [-AppName <name>] [-Branch <branch>] [-FirstDeploy] [-Help]"
    Write-Host ""
    Write-Host "Parameters:"
    Write-Host "  -AppName      Name of the app in CapRover (default: loan-comparison-tool)"
    Write-Host "  -Branch       Git branch to deploy (default: main)"
    Write-Host "  -FirstDeploy  Run first-time deployment setup"
    Write-Host "  -Help         Show this help message"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\deploy-caprover.ps1                    # Deploy main branch to loan-comparison-tool"
    Write-Host "  .\deploy-caprover.ps1 -FirstDeploy       # First time deployment with setup"
    Write-Host "  .\deploy-caprover.ps1 -AppName my-app    # Deploy to custom app name"
    exit 0
}

Write-Host "🚀 CapRover Deployment Script for Loan Comparison Tool" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green

# Check if CapRover CLI is installed
try {
    $caproverVersion = caprover --version 2>$null
    Write-Host "✅ CapRover CLI found: $caproverVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ CapRover CLI not found. Installing..." -ForegroundColor Red
    npm install -g caprover
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install CapRover CLI. Please install manually:" -ForegroundColor Red
        Write-Host "   npm install -g caprover"
        exit 1
    }
    Write-Host "✅ CapRover CLI installed successfully" -ForegroundColor Green
}

# Check if we're in the right directory
if (!(Test-Path "captain-definition")) {
    Write-Host "❌ captain-definition file not found. Please run this script from the project root directory." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Found captain-definition file" -ForegroundColor Green

# Pre-deployment checks
Write-Host ""
Write-Host "🔍 Pre-deployment checks..." -ForegroundColor Yellow

# Check if package.json exists
if (!(Test-Path "package.json")) {
    Write-Host "❌ package.json not found" -ForegroundColor Red
    exit 1
}
Write-Host "✅ package.json found" -ForegroundColor Green

# Check if backend package.json exists
if (!(Test-Path "backend/package.json")) {
    Write-Host "❌ backend/package.json not found" -ForegroundColor Red
    exit 1
}
Write-Host "✅ backend/package.json found" -ForegroundColor Green

# Check if Dockerfile exists
if (!(Test-Path "Dockerfile.fullstack")) {
    Write-Host "❌ Dockerfile.fullstack not found" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Dockerfile.fullstack found" -ForegroundColor Green

# First deploy setup
if ($FirstDeploy) {
    Write-Host ""
    Write-Host "🔧 First-time deployment setup..." -ForegroundColor Yellow
    
    Write-Host "Please ensure you have:"
    Write-Host "1. CapRover server running and accessible"
    Write-Host "2. Logged into CapRover CLI (run 'caprover login' if needed)"
    Write-Host "3. Created app '$AppName' in CapRover dashboard"
    Write-Host "4. Configured environment variables (see .caprover/env.template)"
    Write-Host "5. Set up persistent storage for database (optional but recommended)"
    Write-Host ""
    
    $confirm = Read-Host "Have you completed the above steps? (y/N)"
    if ($confirm -ne "y" -and $confirm -ne "Y") {
        Write-Host "Please complete the setup steps first. See .caprover/DEPLOYMENT_GUIDE.md for details." -ForegroundColor Yellow
        exit 0
    }
}

# Deploy
Write-Host ""
Write-Host "🚀 Starting deployment..." -ForegroundColor Yellow
Write-Host "App Name: $AppName" -ForegroundColor Cyan
Write-Host "Branch: $Branch" -ForegroundColor Cyan

try {
    # Deploy using CapRover CLI
    caprover deploy --appName $AppName --branch $Branch
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "🎉 Deployment successful!" -ForegroundColor Green
        Write-Host "Your app should be available at: https://$AppName.your-caprover-domain.com" -ForegroundColor Green
        Write-Host "Health check: https://$AppName.your-caprover-domain.com/health" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Yellow
        Write-Host "1. Test your application"
        Write-Host "2. Configure custom domain (optional)"
        Write-Host "3. Set up monitoring and backups"
    } else {
        Write-Host "❌ Deployment failed. Check the logs in CapRover dashboard." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Deployment failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Please check:" -ForegroundColor Yellow
    Write-Host "1. CapRover CLI is logged in (run 'caprover login')"
    Write-Host "2. App '$AppName' exists in CapRover"
    Write-Host "3. Network connectivity to CapRover server"
    exit 1
}

Write-Host ""
Write-Host "📚 For more information, see .caprover/DEPLOYMENT_GUIDE.md" -ForegroundColor Cyan

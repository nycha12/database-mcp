﻿# Database MCP Server Setup Script

Write-Host "================================" -ForegroundColor Cyan
Write-Host "Database MCP Server Setup" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Use script directory for all paths to avoid user/computer-specific data
$dbMcpPath = $PSScriptRoot
$envPath = Join-Path $dbMcpPath ".env"
$mcpPath = Join-Path $dbMcpPath "mcp.json"

# Check if directory exists
if (-not (Test-Path $dbMcpPath)) {
    Write-Host "❌ Database MCP directory not found at: $dbMcpPath" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Database MCP directory found" -ForegroundColor Green

# Install npm packages
Write-Host ""
Write-Host "Installing npm dependencies..." -ForegroundColor Yellow
Set-Location $dbMcpPath
try {
    npm install
    Write-Host "✅ Dependencies installed successfully!" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Warning: npm install may have encountered issues" -ForegroundColor Yellow
    Write-Host "Error: $_" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Database Connection Configuration" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""

# Check if .env already exists
if (Test-Path $envPath) {
    Write-Host "⚠️  .env file already exists at: $envPath" -ForegroundColor Yellow
    $overwrite = Read-Host "Do you want to overwrite it? (y/n)"
    if ($overwrite -ne 'y') {
        Write-Host "Setup cancelled. Keeping existing .env file." -ForegroundColor Yellow
        exit
    }
}

Write-Host ""
Write-Host "Please provide your database connection details:" -ForegroundColor Cyan
Write-Host ""

# Get database server
$defaultServer = "localhost"
$server = Read-Host "Enter SQL Server name (default: $defaultServer)"
if ([string]::IsNullOrWhiteSpace($server)) {
    $server = $defaultServer
}

# Get database name
$defaultDatabase = "Dev"
$database = Read-Host "Enter database name (default: $defaultDatabase)"
if ([string]::IsNullOrWhiteSpace($database)) {
    $database = $defaultDatabase
}

# Ask about authentication type
Write-Host ""
Write-Host "Authentication Method:" -ForegroundColor Cyan
Write-Host "1. Windows Authentication (recommended for local development)" -ForegroundColor White
Write-Host "2. SQL Server Authentication" -ForegroundColor White
$authChoice = Read-Host "Select authentication method (1 or 2)"

$dbUser = ""
$dbPassword = ""

if ($authChoice -eq "2") {
    $dbUser = Read-Host "Enter SQL Server username"
    $securePassword = Read-Host "Enter SQL Server password" -AsSecureString
    $dbPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword))
}

# Get port
$defaultPort = "1433"
$port = Read-Host "Enter SQL Server port (default: $defaultPort)"
if ([string]::IsNullOrWhiteSpace($port)) {
    $port = $defaultPort
}

# Ask about encryption
Write-Host ""
$isAzure = Read-Host "Is this Azure SQL Database? (y/n)"
$encrypt = "false"
$trustCert = "true"

if ($isAzure -eq "y") {
    $encrypt = "true"
    $trustCert = "false"
}

# Create .env file
Write-Host ""
Write-Host "Creating .env file..." -ForegroundColor Yellow

$envContent = @"
# Environment variables for Database MCP Server

# SQL Server connection settings
DB_SERVER=$server

# Database name
DB_DATABASE=$database

# SQL Server Authentication (leave empty for Windows Authentication)
DB_USER=$dbUser
DB_PASSWORD=$dbPassword

# Connection options
DB_PORT=$port
DB_ENCRYPT=$encrypt
DB_TRUST_SERVER_CERTIFICATE=$trustCert
"@

$envContent | Out-File -FilePath $envPath -Encoding UTF8

Write-Host "✅ .env file created successfully!" -ForegroundColor Green

# Update mcp.json
Write-Host ""
Write-Host "Updating mcp.json configuration..." -ForegroundColor Yellow

try {
    $mcpContent = Get-Content $mcpPath -Raw | ConvertFrom-Json
    $mcpContent.servers.database.env.DB_SERVER = $server
    $mcpContent.servers.database.env.DB_DATABASE = $database
    $mcpContent.servers.database.env.DB_USER = $dbUser
    $mcpContent.servers.database.env.DB_PASSWORD = $dbPassword
    $mcpContent.servers.database.env.DB_PORT = $port
    $mcpContent.servers.database.env.DB_ENCRYPT = $encrypt
    $mcpContent.servers.database.env.DB_TRUST_SERVER_CERTIFICATE = $trustCert

    $mcpContent | ConvertTo-Json -Depth 10 | Out-File -FilePath $mcpPath -Encoding UTF8

    Write-Host "✅ mcp.json updated successfully!" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Warning: Could not update mcp.json automatically" -ForegroundColor Yellow
    Write-Host "Please update it manually with your database settings" -ForegroundColor Yellow
}

# Test connection
Write-Host ""
Write-Host "Testing database connection..." -ForegroundColor Yellow

try {
    $testScript = @"
require('dotenv').config({ path: '$envPath' });
const sql = require('mssql');
const config = {
    server: '$server',
    database: '$database',
    port: $port,
    options: {
        encrypt: $encrypt === 'true',
        trustServerCertificate: $trustCert === 'true',
        enableArithAbort: true
    }
};
if ('$dbUser') {
    config.user = '$dbUser';
    config.password = '$dbPassword';
    config.authentication = { type: 'default' };
} else {
    config.authentication = { type: 'ntlm', options: { domain: '' } };
}
sql.connect(config).then(() => {
    console.log('Connection successful!');
    process.exit(0);
}).catch(err => {
    console.error('Connection failed: ' + err.message);
    process.exit(1);
});
"@

    $testScript | node
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Database connection successful!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Database connection test failed" -ForegroundColor Yellow
        Write-Host "Please verify your connection settings" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Could not test connection" -ForegroundColor Yellow
    Write-Host "Error: $_" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Setup Complete! 🎉" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Restart your IDE or Copilot to load the new MCP server" -ForegroundColor White
Write-Host "2. The Database MCP server is now available with the following tools:" -ForegroundColor White
Write-Host "   - execute_query" -ForegroundColor Gray
Write-Host "   - list_tables" -ForegroundColor Gray
Write-Host "   - describe_table" -ForegroundColor Gray
Write-Host "   - list_stored_procedures" -ForegroundColor Gray
Write-Host "   - get_stored_procedure_definition" -ForegroundColor Gray
Write-Host "   - execute_stored_procedure" -ForegroundColor Gray
Write-Host "   - search_data" -ForegroundColor Gray
Write-Host "   - get_table_relationships" -ForegroundColor Gray
Write-Host ""
Write-Host "Connection configured:" -ForegroundColor Cyan
Write-Host "  Server: $server" -ForegroundColor White
Write-Host "  Database: $database" -ForegroundColor White
Write-Host "  Authentication: $(if ($dbUser) { 'SQL Server' } else { 'Windows' })" -ForegroundColor White
Write-Host ""
Write-Host "For more information, see README.md in the database-mcp folder" -ForegroundColor Cyan
Write-Host ""


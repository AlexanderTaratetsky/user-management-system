[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [ValidateSet('up','restart','down','logs','ps','seed','help')]
    [string]$Command = 'up'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$composeFile = Join-Path $root 'infrastructure/docker-compose.yml'

$script:ComposeExecutable = $null
$script:ComposeBaseArgs = @()

function Write-Info($message) { Write-Host "[INFO] $message" -ForegroundColor Cyan }
function Write-Ok($message)   { Write-Host "[OK]   $message" -ForegroundColor Green }
function Write-Warn($message) { Write-Warning $message }
function Write-Err($message)  { Write-Host "[ERROR] $message" -ForegroundColor Red }

function Initialize-Compose {
    if (-not (Test-Path $composeFile)) {
        throw "Compose file not found at $composeFile"
    }

    if (Get-Command docker -ErrorAction SilentlyContinue) {
        try {
            docker compose version *> $null
            $script:ComposeExecutable = 'docker'
            $script:ComposeBaseArgs = @('compose','-f',$composeFile)
            return
        } catch {
            # fall through
        }
    }

    if (Get-Command docker-compose -ErrorAction SilentlyContinue) {
        $script:ComposeExecutable = 'docker-compose'
        $script:ComposeBaseArgs = @('-f',$composeFile)
        return
    }

    throw 'Docker Compose is not available. Install Docker Desktop or docker-compose.'
}

function Invoke-Compose {
    param(
        [Parameter(Mandatory = $true)][string[]]$Args,
        [switch]$IgnoreFailure
    )

    & $script:ComposeExecutable @script:ComposeBaseArgs @Args
    $exit = $LASTEXITCODE
    if (-not $IgnoreFailure -and $exit -ne 0) {
        throw "Compose command failed with exit code $exit"
    }
    return $exit
}

function Invoke-Migrations {
    Write-Info 'Applying Prisma migrations (backend container)...'
    $attempts = 10
    for ($i = 1; $i -le $attempts; $i++) {
        try {
            Invoke-Compose -Args @('exec','-T','backend','npx','prisma','migrate','deploy') | Out-Null
            Write-Ok 'Migrations applied successfully.'
            return
        } catch {
            if ($i -eq $attempts) {
                Write-Warn 'Could not run migrations automatically. Run them manually with:'
                Write-Host "  $script:ComposeExecutable $($script:ComposeBaseArgs -join ' ') exec -T backend npx prisma migrate deploy"
                return
            }
            Write-Info "Database not ready (attempt $i/$attempts). Retrying in 3s..."
            Start-Sleep -Seconds 3
        }
    }
}

function Show-Help {
    Write-Host ''
    Write-Host 'Usage: .\run.ps1 <command>'
    Write-Host ''
    Write-Host 'Commands:'
    Write-Host '  up       Build and start containers, run migrations (default)'
    Write-Host '  restart  Rebuild and restart backend/frontend containers'
    Write-Host '  down     Stop and remove containers (volumes preserved)'
    Write-Host '  logs     Tail backend logs (Ctrl+C to exit)'
    Write-Host '  ps       Show service status'
    Write-Host '  seed     Seed sample users via backend/scripts/seed.js'
    Write-Host '  help     Show this help'
    Write-Host ''
    Write-Host 'Examples:'
    Write-Host '  powershell -ExecutionPolicy Bypass -File .\run.ps1 up'
    Write-Host '  pwsh ./run.ps1 seed'
}

try {
    if ($Command -eq 'help') {
        Show-Help
        return
    }

    Initialize-Compose

    switch ($Command) {
        'up' {
            Write-Info "Using compose file: $composeFile"
            Invoke-Compose -Args @('up','-d','--build') | Out-Null
            Invoke-Migrations
            Write-Host ''
            Write-Ok 'Stack is up.'
            Write-Host '  API:      http://localhost:4000   (Swagger: http://localhost:4000/docs)'
            Write-Host '  Frontend: http://localhost:5173'
        }
        'restart' {
            Write-Info 'Rebuilding containers...'
            Invoke-Compose -Args @('up','-d','--build') | Out-Null
            Write-Info 'Restarting backend and frontend...'
            Invoke-Compose -Args @('restart','backend','frontend') -IgnoreFailure | Out-Null
            Write-Ok 'Restart complete.'
        }
        'down' {
            Write-Info 'Stopping and removing containers (volumes preserved)...'
            Invoke-Compose -Args @('down') | Out-Null
            Write-Ok 'Stack stopped.'
        }
        'logs' {
            Write-Info 'Tailing backend logs (Ctrl+C to exit)...'
            Invoke-Compose -Args @('logs','-f','backend')
        }
        'ps' {
            Invoke-Compose -Args @('ps') | Out-Null
        }
        'seed' {
            Write-Info 'Running seed script in backend container...'
            Invoke-Compose -Args @('exec','-T','backend','node','scripts/seed.js') | Out-Null
            Write-Ok 'Seed operation completed.'
        }
        default {
            throw "Unknown command: $Command"
        }
    }
} catch {
    Write-Err $_
    exit 1
}

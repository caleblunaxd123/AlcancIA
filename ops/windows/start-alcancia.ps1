# Starts the AlcancIA backend on this PC at logon (until a real server exists):
#   Docker Desktop -> alcancia-db + alcancia-api containers -> Cloudflare Tunnel
#   https://alcancia.lunalav.pe  ->  http://127.0.0.1:8080
# No secrets here: the API container keeps the environment it was created with,
# and the tunnel credentials live in %USERPROFILE%\.cloudflared.
# Registered by register-autostart.ps1 as a per-user logon task. Log: %LOCALAPPDATA%\AlcancIA\autostart.log

$ErrorActionPreference = 'Continue'
$logDir = Join-Path $env:LOCALAPPDATA 'AlcancIA'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$log = Join-Path $logDir 'autostart.log'
function Log($message) { "$(Get-Date -Format 's')  $message" | Add-Content -Path $log }

Log 'Inicio del arranque de AlcancIA'

# 1. Docker Desktop
$dockerExe = Join-Path $env:ProgramFiles 'Docker\Docker\Docker Desktop.exe'
if (-not (Get-Process 'Docker Desktop' -ErrorAction SilentlyContinue)) {
    if (Test-Path $dockerExe) { Start-Process $dockerExe; Log 'Docker Desktop iniciado' }
    else { Log 'ERROR: Docker Desktop no encontrado'; exit 1 }
}
$ready = $false
for ($i = 0; $i -lt 90; $i++) {
    docker info --format '{{.ServerVersion}}' 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) { $ready = $true; break }
    Start-Sleep -Seconds 4
}
if (-not $ready) { Log 'ERROR: Docker no respondió en 6 minutos'; exit 1 }
Log 'Docker listo'

# 2. Database + API (containers were created with --restart unless-stopped)
docker start alcancia-db 2>&1 | Out-Null
docker start alcancia-api 2>&1 | Out-Null
$apiReady = $false
for ($i = 0; $i -lt 30; $i++) {
    try {
        $r = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:8080/health/ready' -Headers @{ 'X-Forwarded-Proto' = 'https' } -TimeoutSec 3
        if ($r.StatusCode -eq 200) { $apiReady = $true; break }
    } catch { }
    Start-Sleep -Seconds 3
}
Log ("API " + ($(if ($apiReady) { 'lista' } else { 'NO responde (el túnel se inicia igual)' })))

# 3. Cloudflare Tunnel "alcancia" (separate from the LunaLav service)
$cloudflared = Join-Path ${env:ProgramFiles(x86)} 'cloudflared\cloudflared.exe'
$config = Join-Path $env:USERPROFILE '.cloudflared\alcancia.yml'
$running = Get-CimInstance Win32_Process -Filter "Name='cloudflared.exe'" |
    Where-Object { $_.CommandLine -like '*alcancia.yml*' }
if ($running) { Log 'Túnel ya estaba corriendo'; exit 0 }
Start-Process -FilePath $cloudflared -ArgumentList @('tunnel', '--config', "`"$config`"", '--logfile', "`"$(Join-Path $logDir 'tunnel.log')`"", 'run', 'alcancia') -WindowStyle Hidden
Log 'Túnel alcancia iniciado'

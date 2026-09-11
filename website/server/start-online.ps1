# Poluna online: launches node server + cloudflared quick tunnel, writes http/ws URL.
# ASCII-only (PowerShell 5.1 ANSI-safe).

$ServerDir   = $PSScriptRoot
$LauncherDir = Split-Path $ServerDir -Parent | Join-Path -ChildPath 'launcher'
$Node        = 'C:\Program Files\nodejs\node.exe'
$Cloudflared = 'C:\Program Files (x86)\cloudflared\cloudflared.exe'
$LogDir      = Join-Path $env:TEMP 'poluna-online'
$tunnelFile  = Join-Path $ServerDir 'tunnel.url'
$cfOut       = Join-Path $LogDir 'cloudflared.out.log'
$cfErr       = Join-Path $LogDir 'cloudflared.err.log'

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

function Read-Shared([string]$Path) {
    try {
        $fs = [System.IO.File]::Open($Path, 'Open', 'Read', 'ReadWrite')
        $r  = New-Object System.IO.StreamReader($fs)
        $t  = $r.ReadToEnd()
        $r.Close(); $fs.Close()
        return $t
    } catch { return '' }
}

# 1) Node server
$nodeUp = Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq $Node }
if (-not $nodeUp) {
    Start-Process $Node -ArgumentList 'server.js' -WorkingDirectory $ServerDir -WindowStyle Hidden `
        -RedirectStandardOutput (Join-Path $LogDir 'server.out.log') `
        -RedirectStandardError  (Join-Path $LogDir 'server.err.log')
}
Start-Sleep -Seconds 2

# 2) Tunnel
$cfProc  = Get-Process -Name cloudflared -ErrorAction SilentlyContinue
$curUrl  = ''
if (Test-Path $tunnelFile) { $curUrl = (Get-Content $tunnelFile -Raw).Trim() }

if (-not $cfProc) {
    Start-Process $Cloudflared -ArgumentList 'tunnel','--url','http://localhost:3000','--no-autoupdate' `
        -WindowStyle Hidden -RedirectStandardOutput $cfOut -RedirectStandardError $cfErr
    $curUrl = ''
}

$url = ''
if ($curUrl -match '^https://[a-z0-9-]+\.trycloudflare\.com$') {
    $url = $curUrl
} else {
    for ($i = 0; $i -lt 45 -and -not $url; $i++) {
        Start-Sleep -Seconds 1
        $log = Read-Shared $cfErr
        if ($log -match 'https://[a-z0-9-]+\.trycloudflare\.com') { $url = $matches[0] }
        if (-not $log) { $log = Read-Shared $cfOut; if ($log -match 'https://[a-z0-9-]+\.trycloudflare\.com') { $url = $matches[0] } }
    }
}

if ($url) {
    Set-Content -Path $tunnelFile -Value $url
    Set-Content -Path (Join-Path $LauncherDir 'server.url') -Value $url
    $jsFile = (Split-Path $ServerDir -Parent | Join-Path -ChildPath 'script.js')
    if (Test-Path $jsFile) {
        $js = [System.IO.File]::ReadAllText($jsFile, [System.Text.Encoding]::UTF8)
        $js2 = [regex]::Replace($js, 'https://[a-z0-9-]+\.trycloudflare\.com', $url)
        if ($js2 -ne $js) { [System.IO.File]::WriteAllText($jsFile, $js2, (New-Object System.Text.UTF8Encoding($false))) }
    }
    $health = 'FAIL'
    try { $health = (Invoke-RestMethod -Uri ($url + '/api/health') -TimeoutSec 25).ToString() } catch { }
    Write-Output ('POLUNA ONLINE URL: ' + $url)
    Write-Output ('HEALTH: ' + $health)
    Write-Output ('ADMIN: ' + $url + '/admin')
} else {
    Write-Output ('FAILED to get tunnel URL. Log: ' + $cfErr)
}
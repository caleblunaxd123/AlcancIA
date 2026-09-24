# Registers "AlcancIA - Servidor" as a per-user logon task (no admin needed).
# Remove with:  Unregister-ScheduledTask -TaskName 'AlcancIA - Servidor' -Confirm:$false
$script = Join-Path $PSScriptRoot 'start-alcancia.ps1'
$action = New-ScheduledTaskAction -Execute 'powershell.exe' `
    -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$script`""
$trigger = New-ScheduledTaskTrigger -AtLogOn -User "$env:USERDOMAIN\$env:USERNAME"
$trigger.Delay = 'PT30S'   # let the desktop settle first
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
    -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 15) -MultipleInstances IgnoreNew
Register-ScheduledTask -TaskName 'AlcancIA - Servidor' -Action $action -Trigger $trigger -Settings $settings `
    -Description 'Inicia Docker, la API de AlcancIA y el túnel https://alcancia.lunalav.pe al iniciar sesión.' -Force | Out-Null
Get-ScheduledTask -TaskName 'AlcancIA - Servidor' | Select-Object TaskName, State

$ErrorActionPreference = 'Stop'

function Read-Exact {
    param(
        [System.IO.Stream]$Stream,
        [int]$Count
    )

    $buffer = New-Object byte[] $Count
    $offset = 0
    while ($offset -lt $Count) {
        $read = $Stream.Read($buffer, $offset, $Count - $offset)
        if ($read -eq 0) {
            throw "Unexpected end of native messaging input."
        }
        $offset += $read
    }
    return $buffer
}

function Write-NativeMessage {
    param([hashtable]$Message)

    $json = $Message | ConvertTo-Json -Compress
    $payload = [System.Text.Encoding]::UTF8.GetBytes($json)
    $length = [System.BitConverter]::GetBytes([int]$payload.Length)
    $stdout = [Console]::OpenStandardOutput()
    $stdout.Write($length, 0, $length.Length)
    $stdout.Write($payload, 0, $payload.Length)
    $stdout.Flush()
}

try {
    $stdin = [Console]::OpenStandardInput()
    $lengthBytes = Read-Exact -Stream $stdin -Count 4
    $messageLength = [System.BitConverter]::ToInt32($lengthBytes, 0)
    if ($messageLength -lt 0) {
        throw "Invalid native messaging payload length."
    }

    $messageBytes = Read-Exact -Stream $stdin -Count $messageLength
    $messageJson = [System.Text.Encoding]::UTF8.GetString($messageBytes)
    $message = $messageJson | ConvertFrom-Json

    if ($message.action -ne 'update') {
        Write-NativeMessage @{ ok = $false; output = 'unknown action' }
        exit 0
    }

    $repoRoot = Split-Path -Parent $PSScriptRoot
    $gitOutput = & git -C $repoRoot pull --ff-only 2>&1
    $exitCode = $LASTEXITCODE
    $output = ($gitOutput | Out-String).Trim()
    if ($output.Length -gt 500) {
        $output = $output.Substring($output.Length - 500)
    }

    Write-NativeMessage @{
        ok = ($exitCode -eq 0)
        upToDate = $output.Contains('Already up to date')
        output = $output
    }
} catch {
    Write-NativeMessage @{ ok = $false; output = $_.Exception.Message }
}

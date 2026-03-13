param(
  [string]$Endpoint = "https://script.google.com/macros/s/AKfycbyoiTXZkMShjPz8orFiUCcOiGsOabXujlTAGXvTKwc8wow5nLd25HgJHw6iUEXSUoZ9/exec",
  [string]$OutCsv = ""
)

$ErrorActionPreference = "Stop"

$GuestbookMessagePrefix = "__GBV1__"
$HiddenEntries = @(
  "codex-test::ping",
  "codex-ip-test::ping",
  "codex-cors-test::ping",
  "codex-proxy-test::ping"
)

function Convert-FromBase64Url {
  param([string]$Value)

  $normalized = $Value.Replace("-", "+").Replace("_", "/")
  $padding = (4 - ($normalized.Length % 4)) % 4
  if ($padding -gt 0) {
    $normalized += ("=" * $padding)
  }

  $bytes = [Convert]::FromBase64String($normalized)
  return [Text.Encoding]::UTF8.GetString($bytes)
}

function Convert-GuestbookMessage {
  param([string]$RawMessage)

  if (-not $RawMessage.StartsWith($GuestbookMessagePrefix)) {
    return [pscustomobject]@{
      Message = $RawMessage
      Ip = ""
    }
  }

  try {
    $decodedJson = Convert-FromBase64Url -Value $RawMessage.Substring($GuestbookMessagePrefix.Length)
    $decoded = $decodedJson | ConvertFrom-Json
    return [pscustomobject]@{
      Message = [string]$decoded.msg
      Ip = [string]$decoded.ip
    }
  } catch {
    return [pscustomobject]@{
      Message = $RawMessage
      Ip = ""
    }
  }
}

function Get-KstString {
  param([long]$UnixMs)

  $offset = [TimeSpan]::FromHours(9)
  return [DateTimeOffset]::FromUnixTimeMilliseconds($UnixMs).ToOffset($offset).ToString("yyyy-MM-dd HH:mm:ss")
}

$uri = "${Endpoint}?action=list&_=$(Get-Date -UFormat %s)"
$items = Invoke-RestMethod -Method Get -Uri $uri

$rows = foreach ($item in @($items)) {
  $decoded = Convert-GuestbookMessage -RawMessage ([string]$item.msg)
  $name = [string]$item.name
  $message = [string]$decoded.Message
  $entryKey = "$($name.Trim())::$($message.Trim())"

  if ($HiddenEntries -contains $entryKey) {
    continue
  }

  [pscustomobject]@{
    Timestamp = [long]$item.ts
    TimeKst = Get-KstString -UnixMs ([long]$item.ts)
    Name = $name
    Message = $message
    IP = [string]$decoded.Ip
  }
}

$rows = @($rows | Sort-Object Timestamp -Descending)

if ($OutCsv) {
  $rows | Export-Csv -Path $OutCsv -NoTypeInformation -Encoding UTF8
}

$rows | Select-Object TimeKst, Name, Message, IP | Format-Table -AutoSize

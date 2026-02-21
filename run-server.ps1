param(
  [int]$Port = 4173,
  [string]$Root = $PSScriptRoot
)

Add-Type -AssemblyName System.Web

$listener = [System.Net.HttpListener]::new()
$prefix = "http://localhost:$Port/"
$listener.Prefixes.Add($prefix)

try {
  $listener.Start()
} catch {
  Write-Host "[BRS Dashboard] Не удалось запустить PowerShell-сервер на $prefix"
  Write-Host "Возможные причины: порт занят или недостаточно прав."
  exit 1
}

Write-Host "[BRS Dashboard] PowerShell static server запущен: $prefix"
Write-Host "Папка раздачи: $Root"
Write-Host "Остановить: Ctrl+C"

$mime = @{
  '.html' = 'text/html; charset=utf-8'
  '.css'  = 'text/css; charset=utf-8'
  '.js'   = 'application/javascript; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'
  '.png'  = 'image/png'
  '.jpg'  = 'image/jpeg'
  '.jpeg' = 'image/jpeg'
  '.svg'  = 'image/svg+xml'
  '.ico'  = 'image/x-icon'
  '.txt'  = 'text/plain; charset=utf-8'
}

while ($listener.IsListening) {
  try {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response

    $relativePath = [System.Web.HttpUtility]::UrlDecode($request.Url.AbsolutePath.TrimStart('/'))
    if ([string]::IsNullOrWhiteSpace($relativePath)) {
      $relativePath = 'index.html'
    }

    $filePath = Join-Path $Root $relativePath

    if ((Test-Path $filePath) -and -not (Get-Item $filePath).PSIsContainer) {
      $ext = [System.IO.Path]::GetExtension($filePath).ToLowerInvariant()
      $contentType = $mime[$ext]
      if (-not $contentType) { $contentType = 'application/octet-stream' }

      $bytes = [System.IO.File]::ReadAllBytes($filePath)
      $response.StatusCode = 200
      $response.ContentType = $contentType
      $response.ContentLength64 = $bytes.Length
      $response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $msg = "404 Not Found: $relativePath"
      $bytes = [System.Text.Encoding]::UTF8.GetBytes($msg)
      $response.StatusCode = 404
      $response.ContentType = 'text/plain; charset=utf-8'
      $response.ContentLength64 = $bytes.Length
      $response.OutputStream.Write($bytes, 0, $bytes.Length)
    }

    $response.OutputStream.Close()
  } catch {
    if ($listener.IsListening) {
      Write-Host "[BRS Dashboard] Ошибка обработки запроса: $($_.Exception.Message)"
    }
  }
}

$listener.Stop()

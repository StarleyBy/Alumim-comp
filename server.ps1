param([int]$port = 8085)

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()
Write-Output "Server running on http://localhost:$port/"

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".htm"  = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".png"  = "image/png"
    ".ico"  = "image/x-icon"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".mp3"  = "audio/mpeg"
}

$root = $PSScriptRoot

try {
    while ($listener.IsListening) {
        try {
            $context = $listener.GetContext()
            $request = $context.Request
            $response = $context.Response

            $localPath = $request.Url.LocalPath
            if ($localPath -eq "/" -or [string]::IsNullOrEmpty($localPath)) {
                $localPath = "/index.html"
            }

            $decoded = [System.Uri]::UnescapeDataString($localPath).TrimStart('/')
            $filePath = Join-Path $root $decoded

            if (Test-Path -Path $filePath -PathType Leaf) {
                $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
                $mime = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { "application/octet-stream" }
                $response.ContentType = $mime
                $response.AddHeader("Access-Control-Allow-Origin", "*")
                $response.AddHeader("Accept-Ranges", "bytes")

                $bytes = [System.IO.File]::ReadAllBytes($filePath)
                $totalLen = $bytes.Length

                $rangeHeader = $request.Headers["Range"]
                if (![string]::IsNullOrEmpty($rangeHeader) -and $rangeHeader -match "bytes=(\d+)-(\d*)") {
                    $start = [long]$matches[1]
                    $end = if (![string]::IsNullOrEmpty($matches[2])) { [long]$matches[2] } else { $totalLen - 1 }
                    if ($end -ge $totalLen) { $end = $totalLen - 1 }
                    $count = $end - $start + 1

                    $response.StatusCode = 206
                    $response.AddHeader("Content-Range", "bytes $start-$end/$totalLen")
                    $response.ContentLength64 = $count
                    $response.OutputStream.Write($bytes, [int]$start, [int]$count)
                } else {
                    $response.StatusCode = 200
                    $response.ContentLength64 = $totalLen
                    $response.OutputStream.Write($bytes, 0, $totalLen)
                }
            } else {
                $response.StatusCode = 404
                $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
                $response.OutputStream.Write($msg, 0, $msg.Length)
            }
            $response.Close()
        } catch {
            # Client closed connection prematurely or socket reset, ignore and continue listening
        }
    }
} finally {
    $listener.Stop()
}

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Write-Host "이미지 원본 사용을 위해 최적화 기능이 비활성화되었습니다."
exit

Add-Type -AssemblyName System.Drawing

function Get-TotalBytes($items) {
  $collection = @($items)
  if ($collection.Count -eq 0) {
    return 0
  }

  [long]$sum = 0
  foreach ($item in $collection) {
    if ($null -ne $item -and $null -ne $item.Length) {
      $sum += [long]$item.Length
    }
  }
  return $sum
}

function Get-ProjectRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

function Get-JpegCodec {
  return [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
    Where-Object { $_.MimeType -eq "image/jpeg" } |
    Select-Object -First 1
}

function Get-EncoderParameters([long]$quality) {
  $qualityEncoder = [System.Drawing.Imaging.Encoder]::Quality
  $qualityValue = [System.Drawing.Imaging.EncoderParameter]::new($qualityEncoder, $quality)
  $encoderParams = [System.Drawing.Imaging.EncoderParameters]::new(1)
  $encoderParams.Param[0] = $qualityValue
  return $encoderParams
}

function Normalize-RepoRelativePath([string]$path, [string]$projectRoot) {
  $fullPath = [System.IO.Path]::GetFullPath($path)
  $rootWithSlash = $projectRoot.TrimEnd("\") + "\"
  $relative = $fullPath.Substring($rootWithSlash.Length)
  return $relative.Replace("\", "/")
}

function Get-ReferencedImagePaths([string]$projectRoot) {
  $pathRegex = [regex]"/assets/[^""'\)\s>]+?\.(?:avif|gif|jpe?g|png|webp)"
  $referenced = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
  $files = @(
    (Get-ChildItem (Join-Path $projectRoot "src") -File -Recurse)
    (Get-Item (Join-Path $projectRoot "index.html"))
  )

  foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    foreach ($match in $pathRegex.Matches($content)) {
      $assetPath = $match.Value.TrimStart("/")
      $diskPath = Join-Path $projectRoot ("public\" + ($assetPath -replace "/", "\"))
      if (Test-Path $diskPath) {
        [void]$referenced.Add([System.IO.Path]::GetFullPath($diskPath))
      }
    }
  }

  return $referenced
}

function Get-ImageOptions([string]$repoRelativePath) {
  switch -Regex ($repoRelativePath) {
    "^public/assets/hero\.jpg$" { return @{ MaxLong = 1600; Quality = 76L } }
    "^public/assets/hero[1-3]\.jpg$" { return @{ MaxLong = 900; Quality = 78L } }
    "^public/assets/og\.jpg$" { return @{ MaxLong = 1200; Quality = 80L } }
    default { return @{ MaxLong = 1800; Quality = 75L } }
  }
}

function Apply-ExifOrientation([System.Drawing.Image]$image) {
  $orientationId = 0x0112
  if (-not ($image.PropertyIdList -contains $orientationId)) {
    return
  }

  $orientation = [BitConverter]::ToUInt16($image.GetPropertyItem($orientationId).Value, 0)
  $rotateType = [System.Drawing.RotateFlipType]::RotateNoneFlipNone

  switch ($orientation) {
    2 { $rotateType = [System.Drawing.RotateFlipType]::RotateNoneFlipX }
    3 { $rotateType = [System.Drawing.RotateFlipType]::Rotate180FlipNone }
    4 { $rotateType = [System.Drawing.RotateFlipType]::Rotate180FlipX }
    5 { $rotateType = [System.Drawing.RotateFlipType]::Rotate90FlipX }
    6 { $rotateType = [System.Drawing.RotateFlipType]::Rotate90FlipNone }
    7 { $rotateType = [System.Drawing.RotateFlipType]::Rotate270FlipX }
    8 { $rotateType = [System.Drawing.RotateFlipType]::Rotate270FlipNone }
    default { $rotateType = [System.Drawing.RotateFlipType]::RotateNoneFlipNone }
  }

  if ($rotateType -ne [System.Drawing.RotateFlipType]::RotateNoneFlipNone) {
    $image.RotateFlip($rotateType)
  }

  try {
    $image.RemovePropertyItem($orientationId)
  } catch {
  }
}

function Get-ResizeDimensions([int]$width, [int]$height, [int]$maxLong) {
  $longEdge = [Math]::Max($width, $height)
  if ($longEdge -le $maxLong) {
    return @{ Width = $width; Height = $height; Resized = $false }
  }

  $scale = $maxLong / [double]$longEdge
  $newWidth = [Math]::Max(1, [int][Math]::Round($width * $scale))
  $newHeight = [Math]::Max(1, [int][Math]::Round($height * $scale))
  return @{ Width = $newWidth; Height = $newHeight; Resized = $true }
}

function Save-OptimizedJpeg([string]$path, [hashtable]$options, [System.Drawing.Imaging.ImageCodecInfo]$jpegCodec) {
  $originalSize = (Get-Item $path).Length
  $bytes = [System.IO.File]::ReadAllBytes($path)
  $stream = [System.IO.MemoryStream]::new($bytes, $false)
  $source = [System.Drawing.Image]::FromStream($stream, $false, $false)
  try {
    Apply-ExifOrientation $source
    $resize = Get-ResizeDimensions -width $source.Width -height $source.Height -maxLong $options.MaxLong
    $targetWidth = $resize.Width
    $targetHeight = $resize.Height

    $bitmap = [System.Drawing.Bitmap]::new($targetWidth, $targetHeight)
    try {
      $horizontalResolution = if ($source.HorizontalResolution -gt 0) { $source.HorizontalResolution } else { 72 }
      $verticalResolution = if ($source.VerticalResolution -gt 0) { $source.VerticalResolution } else { 72 }
      $bitmap.SetResolution($horizontalResolution, $verticalResolution)

      $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
      try {
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.DrawImage($source, 0, 0, $targetWidth, $targetHeight)
      } finally {
        $graphics.Dispose()
      }

      $tempPath = "$path.tmp"
      $encoderParams = Get-EncoderParameters -quality $options.Quality
      try {
        $bitmap.Save($tempPath, $jpegCodec, $encoderParams)
      } finally {
        $encoderParams.Dispose()
      }

      $tempSize = (Get-Item $tempPath).Length

      if ($tempSize -lt $originalSize -or $resize.Resized) {
        Move-Item $tempPath $path -Force
        return @{
          Changed = $true
          BeforeBytes = $originalSize
          AfterBytes = $tempSize
          BeforeDimensions = "$($source.Width)x$($source.Height)"
          AfterDimensions = "${targetWidth}x${targetHeight}"
        }
      }

      Remove-Item $tempPath -Force
      return @{
        Changed = $false
        BeforeBytes = $originalSize
        AfterBytes = $originalSize
        BeforeDimensions = "$($source.Width)x$($source.Height)"
        AfterDimensions = "$($source.Width)x$($source.Height)"
      }
    } finally {
      $bitmap.Dispose()
    }
  } finally {
    $source.Dispose()
    $stream.Dispose()
  }
}

$projectRoot = Get-ProjectRoot
$assetsRoot = Join-Path $projectRoot "public\assets"
$jpegCodec = Get-JpegCodec
$referenced = Get-ReferencedImagePaths -projectRoot $projectRoot

$allImages = Get-ChildItem $assetsRoot -Recurse -File |
  Where-Object { $_.Extension -match "^\.(avif|gif|jpe?g|png|webp)$" }

$beforeTotal = Get-TotalBytes $allImages

$unusedImages = $allImages | Where-Object { -not $referenced.Contains($_.FullName) }
$removedBytes = Get-TotalBytes $unusedImages
foreach ($image in $unusedImages) {
  Remove-Item $image.FullName -Force
}

$optimized = @()
$retainedImages = Get-ChildItem $assetsRoot -Recurse -File |
  Where-Object { $_.Extension -match "^\.(jpe?g)$" }

foreach ($image in $retainedImages) {
  if (-not $referenced.Contains($image.FullName)) {
    continue
  }

  $repoRelative = Normalize-RepoRelativePath -path $image.FullName -projectRoot $projectRoot
  $options = Get-ImageOptions -repoRelativePath $repoRelative
  $result = Save-OptimizedJpeg -path $image.FullName -options $options -jpegCodec $jpegCodec
  if ($result.Changed) {
    $optimized += [PSCustomObject]@{
      Path = $repoRelative
      BeforeMB = [Math]::Round($result.BeforeBytes / 1MB, 2)
      AfterMB = [Math]::Round($result.AfterBytes / 1MB, 2)
      BeforeDimensions = $result.BeforeDimensions
      AfterDimensions = $result.AfterDimensions
    }
  }
}

$afterImages = Get-ChildItem $assetsRoot -Recurse -File |
  Where-Object { $_.Extension -match "^\.(avif|gif|jpe?g|png|webp)$" }
$afterTotal = Get-TotalBytes $afterImages

[PSCustomObject]@{
  RemovedCount = @($unusedImages).Count
  RemovedMB = [Math]::Round($removedBytes / 1MB, 2)
  OptimizedCount = @($optimized).Count
  BeforeTotalMB = [Math]::Round($beforeTotal / 1MB, 2)
  AfterTotalMB = [Math]::Round($afterTotal / 1MB, 2)
} | Format-List

if (@($optimized).Count -gt 0) {
  $optimized | Sort-Object Path | Format-Table -AutoSize
}

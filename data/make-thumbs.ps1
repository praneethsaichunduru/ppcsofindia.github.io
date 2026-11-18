# Makes small thumbnails of the PPC scans, so list pages do not have to download the full-size pictures.
#
#   powershell -ExecutionPolicy Bypass -File data\make-thumbs.ps1
#
# (or right-click the file in File Explorer > Run with PowerShell)
#
# For every picture in pictures\ppcs it writes a 480-pixel-wide copy to pictures\ppcs\thumbs\ (same file name).
# Only missing or out-of-date thumbnails are made, so it is quick to run again whenever you add scans.
# The pages fall back to the full picture when a thumbnail does not exist yet.

Add-Type -AssemblyName System.Drawing

$root   = Split-Path -Parent $PSScriptRoot
$source = Join-Path $root 'pictures\ppcs'
$target = Join-Path $source 'thumbs'
$width  = 480
$quality = 80

if (-not (Test-Path $target)) { New-Item -ItemType Directory -Path $target | Out-Null }

$jpeg = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$params = New-Object System.Drawing.Imaging.EncoderParameters(1)
$params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]$quality)

$made = 0; $kept = 0; $failed = 0
Get-ChildItem -Path $source -File | Where-Object { $_.Extension -match '^\.(jpe?g)$' } | ForEach-Object {
	$out = Join-Path $target $_.Name
	if ((Test-Path $out) -and ((Get-Item $out).LastWriteTime -ge $_.LastWriteTime)) { $kept++; return }
	try {
		$img = [System.Drawing.Image]::FromFile($_.FullName)
		try {
			$w = [Math]::Min($width, $img.Width)
			$h = [int][Math]::Round($img.Height * $w / $img.Width)
			$bmp = New-Object System.Drawing.Bitmap($w, $h)
			$g = [System.Drawing.Graphics]::FromImage($bmp)
			$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
			$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
			$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
			$g.DrawImage($img, 0, 0, $w, $h)
			$g.Dispose()
			$bmp.Save($out, $jpeg, $params)
			$bmp.Dispose()
			$made++
		} finally { $img.Dispose() }
	} catch {
		$failed++
		Write-Host "Could not make a thumbnail for $($_.Name): $($_.Exception.Message)"
	}
}
Write-Host "Thumbnails made: $made, already up to date: $kept, failed: $failed"

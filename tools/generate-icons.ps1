Add-Type -AssemblyName System.Drawing
$wepIconDirectory = Join-Path $PSScriptRoot '..\public\icons'
New-Item -ItemType Directory -Force -Path $wepIconDirectory | Out-Null
foreach ($wepIcon in @(@{Name='pwa-192.png';Size=192}, @{Name='pwa-512.png';Size=512}, @{Name='maskable-512.png';Size=512})) {
    $wepBitmap = [Drawing.Bitmap]::new($wepIcon.Size, $wepIcon.Size)
    $wepGraphics = [Drawing.Graphics]::FromImage($wepBitmap)
    $wepGraphics.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $wepGraphics.Clear([Drawing.ColorTranslator]::FromHtml('#145c43'))
    $wepScale = $wepIcon.Size / 64.0
    $wepGraphics.ScaleTransform($wepScale, $wepScale)
    $wepPen = [Drawing.Pen]::new([Drawing.Color]::White, 2.5)
    $wepGraphics.DrawRectangle($wepPen, 15, 23, 22, 16)
    $wepGraphics.DrawLines($wepPen, [Drawing.Point[]]@([Drawing.Point]::new(37,28),[Drawing.Point]::new(43,28),[Drawing.Point]::new(49,34),[Drawing.Point]::new(49,39),[Drawing.Point]::new(37,39)))
    $wepBrush = [Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml('#145c43'))
    $wepGraphics.FillEllipse($wepBrush, 19, 36, 7, 7)
    $wepGraphics.FillEllipse($wepBrush, 40, 36, 7, 7)
    $wepGraphics.DrawEllipse($wepPen, 19, 36, 7, 7)
    $wepGraphics.DrawEllipse($wepPen, 40, 36, 7, 7)
    $wepBitmap.Save((Join-Path $wepIconDirectory $wepIcon.Name), [Drawing.Imaging.ImageFormat]::Png)
    $wepPen.Dispose()
    $wepBrush.Dispose()
    $wepGraphics.Dispose()
    $wepBitmap.Dispose()
}

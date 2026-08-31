Add-Type -AssemblyName System.Drawing

$OutputDir = Join-Path $PSScriptRoot "..\docs\final-report\figures"
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

function New-Canvas {
    param([int]$Width = 1600, [int]$Height = 900)
    $bitmap = New-Object System.Drawing.Bitmap $Width, $Height
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
    $graphics.Clear([System.Drawing.Color]::FromArgb(248, 250, 252))
    return @($bitmap, $graphics)
}

function New-Font {
    param([float]$Size, [System.Drawing.FontStyle]$Style = [System.Drawing.FontStyle]::Regular)
    return New-Object System.Drawing.Font "Segoe UI", $Size, $Style
}

function New-Brush {
    param([string]$Hex)
    return New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml($Hex))
}

function New-Pen {
    param([string]$Hex, [float]$Width = 2)
    return New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml($Hex), $Width)
}

function Draw-Text {
    param(
        [System.Drawing.Graphics]$G,
        [string]$Text,
        [int]$X,
        [int]$Y,
        [int]$W,
        [int]$H,
        [System.Drawing.Font]$Font,
        [string]$Color = "#111827",
        [string]$Align = "Near"
    )
    $brush = New-Brush $Color
    $format = New-Object System.Drawing.StringFormat
    $format.Alignment = [System.Drawing.StringAlignment]::$Align
    $format.LineAlignment = [System.Drawing.StringAlignment]::Near
    $G.DrawString($Text, $Font, $brush, (New-Object System.Drawing.RectangleF $X, $Y, $W, $H), $format)
    $brush.Dispose()
    $format.Dispose()
}

function Draw-Box {
    param(
        [System.Drawing.Graphics]$G,
        [int]$X,
        [int]$Y,
        [int]$W,
        [int]$H,
        [string]$Fill,
        [string]$Stroke = "#CBD5E1",
        [float]$StrokeWidth = 2
    )
    $brush = New-Brush $Fill
    $pen = New-Pen $Stroke $StrokeWidth
    $rect = New-Object System.Drawing.Rectangle $X, $Y, $W, $H
    $G.FillRectangle($brush, $rect)
    $G.DrawRectangle($pen, $rect)
    $brush.Dispose()
    $pen.Dispose()
}

function Draw-Arrow {
    param(
        [System.Drawing.Graphics]$G,
        [int]$X1,
        [int]$Y1,
        [int]$X2,
        [int]$Y2,
        [string]$Color = "#334155",
        [float]$Width = 3,
        [string]$Label = ""
    )
    $pen = New-Pen $Color $Width
    $cap = New-Object System.Drawing.Drawing2D.AdjustableArrowCap 6, 6, $true
    $pen.CustomEndCap = $cap
    $G.DrawLine($pen, $X1, $Y1, $X2, $Y2)
    if ($Label -ne "") {
        $font = New-Font 15 ([System.Drawing.FontStyle]::Regular)
        Draw-Text $G $Label ([Math]::Min($X1, $X2) + 8) ([Math]::Min($Y1, $Y2) - 28) ([Math]::Abs($X2 - $X1) + 150) 30 $font $Color
        $font.Dispose()
    }
    $cap.Dispose()
    $pen.Dispose()
}

function Draw-Node {
    param(
        [System.Drawing.Graphics]$G,
        [string]$Title,
        [string]$Subtitle,
        [int]$X,
        [int]$Y,
        [int]$W,
        [int]$H,
        [string]$Fill,
        [string]$Stroke
    )
    Draw-Box $G $X $Y $W $H $Fill $Stroke 3
    $titleFont = New-Font 18 ([System.Drawing.FontStyle]::Bold)
    $subFont = New-Font 13
    Draw-Text $G $Title ($X + 16) ($Y + 12) ($W - 32) 30 $titleFont "#111827"
    Draw-Text $G $Subtitle ($X + 16) ($Y + 44) ($W - 32) ($H - 54) $subFont "#374151"
    $titleFont.Dispose()
    $subFont.Dispose()
}

function Save-Png {
    param([System.Drawing.Bitmap]$Bitmap, [System.Drawing.Graphics]$Graphics, [string]$Path)
    $Graphics.Dispose()
    $Bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
    $Bitmap.Dispose()
}

function Draw-AstDiagram {
    $items = New-Canvas
    $bitmap = $items[0]
    $g = $items[1]
    $title = New-Font 30 ([System.Drawing.FontStyle]::Bold)
    $subtitle = New-Font 16
    Draw-Text $g "AST-Based Program Analysis in RICA" 60 35 1480 45 $title "#0F172A"
    Draw-Text $g "How Java source code is converted into structured facts used by RICA detectors." 62 82 1480 30 $subtitle "#475569"

    Draw-Node $g "Java Source File" "Controller, Service, Entity, Repository, DTO, API resource" 70 175 280 150 "#E0F2FE" "#0284C7"
    Draw-Text $g "Example evidence:" 95 355 240 24 (New-Font 15 ([System.Drawing.FontStyle]::Bold)) "#0F172A"
    Draw-Text $g "@PostMapping`nnew PaymentService()`nimport ...Repository`nreturn Order" 95 385 250 120 (New-Font 15) "#334155"

    Draw-Node $g "RICA Parser" "Reads Java syntax and extracts only the facts needed for editor-time architecture analysis." 465 175 300 150 "#FEF3C7" "#D97706"
    Draw-Arrow $g 350 250 465 250 "#334155" 3 "parse"

    Draw-Box $g 875 130 340 390 "#F8FAFC" "#64748B" 3
    Draw-Text $g "Structured AST Facts" 900 152 300 30 (New-Font 20 ([System.Drawing.FontStyle]::Bold)) "#111827"
    $factsFont = New-Font 15
    Draw-Text $g "package name`nimports`nclasses and stereotypes`nannotations`nfields and injected dependencies`nmethods and parameters`nreturn types`nmethod calls`nobject creations`nsource locations" 910 205 295 285 $factsFont "#334155"
    Draw-Arrow $g 765 250 875 250 "#334155" 3 "normalize"

    Draw-Box $g 760 600 530 150 "#EEF2FF" "#4F46E5" 3
    Draw-Text $g "AST Cache" 785 622 470 30 (New-Font 20 ([System.Drawing.FontStyle]::Bold)) "#111827"
    Draw-Text $g "RICA stores the extracted facts so analyzers can reuse them during full scans and incremental revalidation." 785 660 470 72 (New-Font 15) "#334155"
    Draw-Arrow $g 1045 520 1045 600 "#4F46E5" 3 "store"

    Draw-Box $g 1320 120 220 600 "#F0FDF4" "#16A34A" 3
    Draw-Text $g "Detectors" 1345 142 175 32 (New-Font 20 ([System.Drawing.FontStyle]::Bold)) "#111827"
    Draw-Text $g "Layer rules`nAPI boundary rules`nPackage boundary rules`nCross-file rules`nDesign-pattern opportunities`nSelected best-practice checks" 1345 198 170 220 (New-Font 15) "#334155"
    Draw-Box $g 1345 475 150 105 "#DCFCE7" "#16A34A" 2
    Draw-Text $g "Diagnostics" 1365 495 120 24 (New-Font 17 ([System.Drawing.FontStyle]::Bold)) "#166534"
    Draw-Text $g "rule code`nevidence`nline range" 1365 525 125 52 (New-Font 13) "#166534"
    Draw-Arrow $g 1215 250 1320 250 "#16A34A" 3 "trigger"
    Draw-Arrow $g 1290 675 1370 580 "#16A34A" 3

    Draw-Text $g "Figure: AST facts allow RICA to detect architecture and design-quality issues without relying on fragile text search." 70 820 1460 35 (New-Font 16 ([System.Drawing.FontStyle]::Italic)) "#475569"
    $title.Dispose()
    $subtitle.Dispose()
    $factsFont.Dispose()
    Save-Png $bitmap $g (Join-Path $OutputDir "fig-2-2-ast-based-program-analysis.png")
}

function Draw-DependencyDiagram {
    $items = New-Canvas
    $bitmap = $items[0]
    $g = $items[1]
    Draw-Text $g "Dependency Graph Analysis in RICA" 60 35 1480 45 (New-Font 30 ([System.Drawing.FontStyle]::Bold)) "#0F172A"
    Draw-Text $g "How RICA models classes/files as nodes and source relationships as edges for project-level violation detection." 62 82 1480 30 (New-Font 16) "#475569"

    Draw-Node $g "OrderController" "Presentation layer" 90 165 250 95 "#DBEAFE" "#2563EB"
    Draw-Node $g "OrderService" "Application layer" 515 150 250 95 "#EDE9FE" "#7C3AED"
    Draw-Node $g "Order" "Domain entity" 515 430 250 95 "#DCFCE7" "#16A34A"
    Draw-Node $g "OrderRepository" "Infrastructure / repository" 940 150 270 95 "#FFEDD5" "#EA580C"
    Draw-Node $g "OrderResponseDTO" "API contract / DTO" 940 430 270 95 "#FCE7F3" "#DB2777"
    Draw-Node $g "ReportController" "Presentation layer" 90 430 250 95 "#DBEAFE" "#2563EB"

    Draw-Arrow $g 340 212 515 200 "#15803D" 4 "allowed: calls service"
    Draw-Arrow $g 765 198 940 198 "#15803D" 4 "allowed: persistence port/repository"
    Draw-Arrow $g 640 245 640 430 "#15803D" 4 "allowed: uses domain"
    Draw-Arrow $g 765 480 940 480 "#15803D" 4 "allowed: maps to DTO"

    Draw-Arrow $g 340 250 940 180 "#DC2626" 5 "violation: controller bypasses service"
    Draw-Arrow $g 765 170 250 430 "#DC2626" 4 "violation: inverse dependency"
    Draw-Arrow $g 605 430 605 245 "#B91C1C" 4 "cycle risk"

    Draw-Box $g 1270 150 260 395 "#F8FAFC" "#64748B" 3
    Draw-Text $g "Graph-Based RICA Rules" 1290 174 220 28 (New-Font 18 ([System.Drawing.FontStyle]::Bold)) "#111827"
    Draw-Text $g "RICA-V401`nController bypass`n`nRICA-V402`nLayer violation`n`nRICA-V403`nCircular dependency`n`nRICA-V404`nEntity exposure" 1292 220 220 260 (New-Font 15) "#334155"

    Draw-Arrow $g 1210 200 1270 230 "#334155" 3 "graph facts"
    Draw-Arrow $g 1210 480 1270 445 "#334155" 3

    Draw-Box $g 360 635 880 115 "#EEF2FF" "#4F46E5" 3
    Draw-Text $g "Incremental Revalidation" 385 656 820 28 (New-Font 19 ([System.Drawing.FontStyle]::Bold)) "#111827"
    Draw-Text $g "When one class changes, RICA uses dependent maps to re-check affected files and graph rules instead of blindly reanalyzing every detector." 385 695 820 36 (New-Font 15) "#334155"

    Draw-Text $g "Figure: Dependency graph analysis lets RICA detect violations that only become visible across files and layer relationships." 70 820 1460 35 (New-Font 16 ([System.Drawing.FontStyle]::Italic)) "#475569"
    Save-Png $bitmap $g (Join-Path $OutputDir "fig-2-3-dependency-graph-analysis.png")
}

Draw-AstDiagram
Draw-DependencyDiagram

Write-Host "Generated:"
Write-Host (Join-Path $OutputDir "fig-2-2-ast-based-program-analysis.png")
Write-Host (Join-Path $OutputDir "fig-2-3-dependency-graph-analysis.png")

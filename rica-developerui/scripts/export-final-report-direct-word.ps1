param(
  [string]$MarkdownPath = "docs\final-report\final-report.md",
  [string]$DocxPath = "docs\final-report\RICA_Final_Year_Individual_Report.docx",
  [string]$PdfPath = "docs\final-report\RICA_Final_Year_Individual_Report.pdf"
)

$ErrorActionPreference = "Stop"

$root = (Get-Location).Path
$markdown = (Resolve-Path -LiteralPath $MarkdownPath).Path
$docx = [string](Join-Path $root $DocxPath)
$pdf = [string](Join-Path $root $PdfPath)
$figureRoot = Split-Path -Parent $markdown

$wdStory = 6
$wdPageBreak = 7
$wdLineSpace1pt5 = 1
$wdFormatXMLDocument = 16
$wdExportFormatPDF = 17
$wdAutoFitWindow = 2

function Clean-Inline([string]$text) {
  $text = $text -replace '\*\*([^*]+)\*\*', '$1'
  $text = $text -replace '\*([^*]+)\*', '$1'
  $text = $text -replace '`([^`]+)`', '$1'
  $text = $text -replace '\[(.*?)\]\((.*?)\)', '$1'
  return $text
}

function Add-TextParagraph($selection, [string]$text, [string]$style = "Normal") {
  $selection.Style = $style
  $selection.TypeText((Clean-Inline $text))
  $selection.TypeParagraph()
}

function Add-Table($selection, [string[]]$tableLines) {
  $rows = @()
  foreach ($line in $tableLines) {
    if ($line.Trim() -match '^\|\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$') {
      continue
    }
    $cells = $line.Trim().Trim('|').Split('|') | ForEach-Object { Clean-Inline $_.Trim() }
    if ($cells.Count -gt 0) {
      $rows += ,$cells
    }
  }
  if ($rows.Count -eq 0) {
    return
  }

  $range = $selection.Range
  $table = $selection.Document.Tables.Add($range, $rows.Count, $rows[0].Count)
  $table.Borders.Enable = 1
  $table.Range.Font.Name = "Times New Roman"
  $table.Range.Font.Size = 10

  for ($r = 1; $r -le $rows.Count; $r++) {
    for ($c = 1; $c -le $rows[$r - 1].Count; $c++) {
      $table.Cell($r, $c).Range.Text = $rows[$r - 1][$c - 1]
    }
  }

  $table.Rows.Item(1).Range.Bold = $true
  $table.AutoFitBehavior($wdAutoFitWindow)
  $selection.EndKey($wdStory) | Out-Null
  $selection.TypeParagraph()
}

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0

try {
  $doc = $word.Documents.Add()
  $selection = $word.Selection

  foreach ($section in $doc.Sections) {
    $section.PageSetup.TopMargin = 72
    $section.PageSetup.BottomMargin = 72
    $section.PageSetup.LeftMargin = 72
    $section.PageSetup.RightMargin = 72
  }

  $normal = $doc.Styles.Item("Normal")
  $normal.Font.Name = "Times New Roman"
  $normal.Font.Size = 12
  $normal.ParagraphFormat.LineSpacingRule = $wdLineSpace1pt5
  $normal.ParagraphFormat.SpaceAfter = 6

  $doc.Styles.Item("Heading 1").Font.Name = "Times New Roman"
  $doc.Styles.Item("Heading 1").Font.Size = 16
  $doc.Styles.Item("Heading 1").Font.Bold = $true
  $doc.Styles.Item("Heading 2").Font.Name = "Times New Roman"
  $doc.Styles.Item("Heading 2").Font.Size = 14
  $doc.Styles.Item("Heading 2").Font.Bold = $true
  $doc.Styles.Item("Heading 3").Font.Name = "Times New Roman"
  $doc.Styles.Item("Heading 3").Font.Size = 12
  $doc.Styles.Item("Heading 3").Font.Bold = $true

  $lines = Get-Content -LiteralPath $markdown
  $tableLines = New-Object System.Collections.Generic.List[string]
  $inCode = $false
  $codeLines = New-Object System.Collections.Generic.List[string]

  foreach ($line in $lines) {
    $trimmed = $line.Trim()

    if ($inCode) {
      if ($trimmed.StartsWith('```')) {
        $selection.Style = "Normal"
        $selection.Font.Name = "Courier New"
        $selection.Font.Size = 9
        $selection.TypeText(($codeLines -join "`r`n"))
        $selection.TypeParagraph()
        $selection.Font.Name = "Times New Roman"
        $selection.Font.Size = 12
        $codeLines.Clear()
        $inCode = $false
      }
      else {
        $codeLines.Add($line)
      }
      continue
    }

    if ($trimmed.StartsWith('```')) {
      $inCode = $true
      continue
    }

    if ($trimmed -match '^\|.*\|$') {
      $tableLines.Add($trimmed)
      continue
    }
    elseif ($tableLines.Count -gt 0) {
      Add-Table $selection $tableLines.ToArray()
      $tableLines.Clear()
    }

    if ($trimmed.Length -eq 0) {
      $selection.TypeParagraph()
      continue
    }

    if ($trimmed -eq "---") {
      $selection.InsertBreak($wdPageBreak)
      continue
    }

    if ($trimmed -match '^!\[([^\]]*)\]\(([^)]+)\)$') {
      $caption = Clean-Inline $matches[1]
      $relative = $matches[2].Replace('/', [System.IO.Path]::DirectorySeparatorChar)
      $imagePath = [System.IO.Path]::GetFullPath((Join-Path $figureRoot $relative))
      if (Test-Path -LiteralPath $imagePath) {
        $shape = $selection.InlineShapes.AddPicture($imagePath)
        if ($shape.Width -gt 450) {
          $ratio = 450 / $shape.Width
          $shape.Width = 450
          $shape.Height = $shape.Height * $ratio
        }
        $selection.TypeParagraph()
        Add-TextParagraph $selection $caption "Normal"
      }
      continue
    }

    if ($trimmed -match '^#\s+(.+)$') {
      Add-TextParagraph $selection $matches[1] "Heading 1"
      continue
    }
    if ($trimmed -match '^##\s+(.+)$') {
      Add-TextParagraph $selection $matches[1] "Heading 2"
      continue
    }
    if ($trimmed -match '^###\s+(.+)$') {
      Add-TextParagraph $selection $matches[1] "Heading 3"
      continue
    }
    if ($trimmed -match '^>\s*(.+)$') {
      Add-TextParagraph $selection $matches[1] "Normal"
      continue
    }
    if ($trimmed -match '^-\s+(.+)$') {
      Add-TextParagraph $selection ("- " + $matches[1]) "Normal"
      continue
    }
    if ($trimmed -match '^\d+\.\s+(.+)$') {
      Add-TextParagraph $selection $trimmed "Normal"
      continue
    }

    Add-TextParagraph $selection $trimmed "Normal"
  }

  if ($tableLines.Count -gt 0) {
    Add-Table $selection $tableLines.ToArray()
  }

  $doc.SaveAs2([ref]$docx, [ref]$wdFormatXMLDocument)
  $doc.ExportAsFixedFormat($pdf, $wdExportFormatPDF)
  $doc.Close()
}
finally {
  $word.Quit()
}

Write-Output $docx
Write-Output $pdf

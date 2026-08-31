param(
  [string]$DocxPath = "docs\final-report\RICA_Final_Year_Individual_Report.docx"
)

$ErrorActionPreference = "Stop"
$resolvedDocx = (Resolve-Path -LiteralPath $DocxPath).Path

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0

try {
  $doc = $word.Documents.Open($resolvedDocx, $false, $true)
  $pages = $doc.ComputeStatistics(2)
  $words = $doc.ComputeStatistics(0)
  $paragraphs = $doc.Paragraphs.Count
  $tables = $doc.Tables.Count
  $images = $doc.InlineShapes.Count
  $doc.Close($false)
}
finally {
  $word.Quit()
}

Write-Output "Pages=$pages Words=$words Paragraphs=$paragraphs Tables=$tables Images=$images"

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$figureDir = Join-Path (Get-Location) "docs\final-report\figures"
New-Item -ItemType Directory -Force -Path $figureDir | Out-Null

function New-Canvas($path, $title, $subtitle, $blocks) {
  $width = 1400
  $height = 900
  $bmp = New-Object System.Drawing.Bitmap($width, $height)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear([System.Drawing.Color]::FromArgb(250, 251, 253))

  $fontTitle = New-Object System.Drawing.Font("Segoe UI", 34, [System.Drawing.FontStyle]::Bold)
  $fontSub = New-Object System.Drawing.Font("Segoe UI", 17, [System.Drawing.FontStyle]::Regular)
  $fontHead = New-Object System.Drawing.Font("Segoe UI", 16, [System.Drawing.FontStyle]::Bold)
  $fontBody = New-Object System.Drawing.Font("Segoe UI", 13, [System.Drawing.FontStyle]::Regular)
  $fontMono = New-Object System.Drawing.Font("Consolas", 12, [System.Drawing.FontStyle]::Regular)
  $brushInk = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(28, 35, 45))
  $brushMuted = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(90, 99, 115))

  $g.DrawString($title, $fontTitle, $brushInk, 55, 38)
  $g.DrawString($subtitle, $fontSub, $brushMuted, 58, 93)

  foreach ($b in $blocks) {
    $rect = [System.Drawing.RectangleF]::new([float]$b.X, [float]$b.Y, [float]$b.W, [float]$b.H)
    $fill = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml($b.Fill))
    $pen = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml($b.Stroke), 2)
    $g.FillRectangle($fill, $rect)
    $g.DrawRectangle($pen, $b.X, $b.Y, $b.W, $b.H)
    $headBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml($b.HeadColor))
    $g.DrawString($b.Head, $fontHead, $headBrush, $b.X + 18, $b.Y + 16)
    $bodyFont = if ($b.Mono) { $fontMono } else { $fontBody }
    $bodyRect = [System.Drawing.RectangleF]::new(([float]$b.X + 18), ([float]$b.Y + 50), ([float]$b.W - 36), ([float]$b.H - 60))
    $g.DrawString($b.Body, $bodyFont, $brushInk, $bodyRect)
  }

  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose()
  $bmp.Dispose()
}

function Block($x, $y, $w, $h, $head, $body, $fill = "#FFFFFF", $stroke = "#C7D0DD", $headColor = "#0B2545", $mono = $false) {
  [PSCustomObject]@{
    X = $x; Y = $y; W = $w; H = $h
    Head = $head; Body = $body
    Fill = $fill; Stroke = $stroke; HeadColor = $headColor; Mono = $mono
  }
}

New-Canvas (Join-Path $figureDir "fig-1-1-architecture-erosion.png") `
  "Architecture Erosion in a Layered Java Project" `
  "Small shortcuts accumulate until layer responsibilities become unclear." @(
    Block 70 170 360 160 "Intended structure" "Controller -> Service -> Repository -> Database`nDTOs protect API contracts.`nDomain rules stay near domain concepts." "#EAF4FF" "#7AA9D6"
    Block 520 170 360 160 "Erosion symptoms" "Controller calls repository directly.`nEntity performs data access.`nService becomes a pass-through class.`nInfrastructure leaks inward." "#FFF4E6" "#DCA45A"
    Block 970 170 360 160 "Long-term effect" "Testing becomes harder.`nChanges ripple across layers.`nBusiness rules are scattered.`nRefactoring cost increases." "#FCECEC" "#D17A7A"
    Block 220 470 960 220 "RICA intervention" "RICA detects these structures as inline diagnostics and panel findings, then links each rule to evidence, rationale, examples, fix guidance, and related architecture concepts." "#EEF8F0" "#7EBB86"
  )

New-Canvas (Join-Path $figureDir "fig-2-1-dependency-direction.png") `
  "Dependency Direction in Layered and Clean Architecture" `
  "Source dependencies should point toward stable domain/application policy." @(
    Block 95 170 260 150 "Presentation" "Controllers`nREST resources`nUI adapters" "#EAF4FF" "#7AA9D6"
    Block 405 170 260 150 "Application" "Use cases`nServices`nPorts" "#EEF8F0" "#7EBB86"
    Block 715 170 260 150 "Domain" "Entities`nRules`nValue objects" "#FFF8E7" "#D5B35B"
    Block 1025 170 260 150 "Infrastructure" "Repositories`nHTTP clients`nFiles, SQL, SDKs" "#F2ECFF" "#9A86D1"
    Block 180 460 1040 230 "RICA checks" "Allowed direction: Presentation -> Application -> Domain, Infrastructure -> Application/Domain.`nSuspicious direction: Domain/Application importing Presentation or framework-specific infrastructure.`nRelevant rules: RICA-V401, RICA-V402, RICA-V403, RICA-V501." "#FFFFFF" "#C7D0DD"
  )

New-Canvas (Join-Path $figureDir "fig-3-3-incremental-revalidation.png") `
  "Incremental Revalidation Workflow" `
  "A file save invalidates only the detector inputs affected by changed AST facts." @(
    Block 70 160 260 135 "1. File saved" "Parse changed Java file only." "#EAF4FF" "#7AA9D6"
    Block 380 160 260 135 "2. Diff AST facts" "Compare imports, calls, fields, annotations, object creation, complexity, signatures." "#EEF8F0" "#7EBB86"
    Block 690 160 260 135 "3. Update graph" "Patch dependency graph only when relationships or imports changed." "#FFF8E7" "#D5B35B"
    Block 1000 160 260 135 "4. Select rules" "Run only affected detector families and design-pattern rule types." "#F2ECFF" "#9A86D1"
    Block 220 460 400 160 "5. Merge results" "Remove stale findings for affected files/rules and keep unrelated diagnostics." "#FFFFFF" "#C7D0DD"
    Block 780 460 400 160 "6. Refresh VS Code" "Update inline diagnostics and Architecture Violations panel." "#FFFFFF" "#C7D0DD"
  )

New-Canvas (Join-Path $figureDir "fig-4-1-command-palette.png") `
  "RICA Commands in VS Code" `
  "Representative command palette view based on package.json command contributions." @(
    Block 165 145 1070 575 "Command Palette" "Java AST: Analyze Full Project`nJava AST: Analyze Current File`nJava AST: Show Architecture Violations`nJava AST: Show AST Viewer`nJava AST: Open Browser Viewer`nJava AST: Show Status`nJava AST: Open RICA Documentation`nJava AST: Reset Backend Data" "#1E1E1E" "#4D4D4D" "#FFFFFF" $true
  )

New-Canvas (Join-Path $figureDir "fig-4-2-inline-diagnostic.png") `
  "Inline Diagnostic Produced by RICA" `
  "Representative editor feedback showing rule code, severity, evidence, and reason." @(
    Block 130 150 1140 175 "Editor marker" "import com.foo.presentation.UserController;    // RICA-V501 underline`n`nLayer 'application' should not depend on layer 'presentation'." "#FFF9E8" "#D5B35B" "#7A5A00" $true
    Block 130 390 1140 230 "Diagnostic hover" "Code: RICA-V501`nSeverity: Error`nEvidence: import com.foo.presentation.UserController`nReason: application layer depends on presentation layer`nType: Architecture best-practice violation" "#FFFFFF" "#C7D0DD" "#0B2545" $true
  )

New-Canvas (Join-Path $figureDir "fig-4-4-rule-doc-page.png") `
  "Violation Documentation Page" `
  "Representative RICA rule page structure used for developer-friendly remediation." @(
    Block 85 145 370 220 "What triggers it" "A file in one architectural layer imports or references a class from a disallowed layer." "#EAF4FF" "#7AA9D6"
    Block 515 145 370 220 "Why it matters" "The dependency rule is broken, making inner code harder to test, reuse, or change independently." "#FFF8E7" "#D5B35B"
    Block 945 145 370 220 "How to fix" "Move framework details outward, introduce a port/interface, or tune layer configuration for valid framework imports." "#EEF8F0" "#7EBB86"
    Block 185 470 1030 230 "Documentation pattern" "Each rule page includes: trigger, violating example, fixed example, highlighted diff, common framework cases, how to fix, how to verify, related concepts, and tags." "#FFFFFF" "#C7D0DD"
  )

New-Canvas (Join-Path $figureDir "fig-4-5-concept-map.png") `
  "Rule Concept Map" `
  "RICA connects violation codes to architecture concepts developers can learn." @(
    Block 95 160 330 180 "RICA-V501" "Package boundary violation`nConcepts: Clean Architecture, layered architecture, package boundaries." "#EAF4FF" "#7AA9D6"
    Block 535 160 330 180 "RICA-V303" "Strategy missing`nConcepts: behavioral patterns, refactoring playbook, design pattern basics." "#EEF8F0" "#7EBB86"
    Block 975 160 330 180 "RICA-V110" "Direct HTTP call`nConcepts: gateways and adapters, infrastructure, framework coupling." "#FFF8E7" "#D5B35B"
    Block 230 480 940 180 "Learning loop" "Open violation -> read exact trigger -> learn related concept -> return to rule page -> apply smallest architecture-preserving refactor." "#FFFFFF" "#C7D0DD"
  )

New-Canvas (Join-Path $figureDir "fig-5-1-test-projects.png") `
  "Evaluation Test Project Structure" `
  "Controlled Java fixtures used to evaluate deterministic rule behaviour." @(
    Block 95 160 330 190 "rica-clean" "7 files`nExpected output: 0 violations`nPurpose: check quiet behaviour on compliant architecture." "#EEF8F0" "#7EBB86"
    Block 535 160 330 190 "rica-violations-heavy" "10 files`nExpected output: 70 violations`nPurpose: exercise layered, API, graph, package, and design findings." "#FFF4E6" "#DCA45A"
    Block 975 160 330 190 "rica-structural" "41 files`nExpected output: 36 violations`nPurpose: cover deterministic design-pattern rules." "#EAF4FF" "#7AA9D6"
    Block 230 485 940 170 "Evaluation value" "The fixtures test both positive detection and clean-project quietness. They are controlled datasets, not a replacement for future large-scale precision/recall evaluation." "#FFFFFF" "#C7D0DD"
  )

New-Canvas (Join-Path $figureDir "fig-5-2-test-output.png") `
  "Automated Test Output Summary" `
  "Latest verification evidence used in the final evaluation chapter." @(
    Block 120 145 1160 565 "Terminal evidence" "npm test`n157 passing`n1 pending`n`nnpm run test:projects`nrica-clean: 0 violations`nrica-violations-heavy: 70 violations`nrica-structural: 36 violations`nAll expected deterministic rules are covered by the violation test projects." "#1E1E1E" "#4D4D4D" "#FFFFFF" $true
  )

Write-Output "Generated final report figures in $figureDir"

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const inputPath = path.join(root, 'docs', 'final-report', 'weekly-project-diary.md');
const outDir = path.join(root, 'docs', 'final-report');
const outputPath = path.join(outDir, 'RICA_Weekly_Project_Diary_Logbook_Corrected_Evidence.docx');
const buildDir = path.join(root, 'outputs', 'weekly-diary-docx-build');

function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function cleanText(value) {
  return String(value ?? '')
    .replace(/\r/g, '')
    .replace(/\*\*/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .trim();
}

function parseDiary(md) {
  const title = 'RICA Weekly Project Diary / Logbook';
  const projectTitle = /Project title:\s*(.+)/.exec(md)?.[1]?.trim() || '';
  const student = /Student:\s*(.+)/.exec(md)?.[1]?.trim() || '';
  const studentId = /Student ID:\s*(.+)/.exec(md)?.[1]?.trim() || '';
  const programme = /Programme:\s*(.+)/.exec(md)?.[1]?.trim() || '';
  const supervisor = /Supervisor:\s*(.+)/.exec(md)?.[1]?.trim() || '';

  const weekRegex = /^## Week\s+(\d+):\s+(.+)$/gm;
  const matches = [...md.matchAll(weekRegex)];
  const weeks = matches.map((match, index) => {
    const start = match.index + match[0].length;
    const end = index + 1 < matches.length ? matches[index + 1].index : md.indexOf('## Summary of Work Completed Across the Project');
    const block = md.slice(start, end > -1 ? end : md.length);
    return {
      week: `Week ${match[1]}`,
      period: match[2].trim(),
      mainFocus: extractInline(block, 'Main focus'),
      workCompleted: extractList(block, 'Work completed'),
      evidence: extractList(block, 'Evidence/output'),
      reflection: extractList(block, 'Reflection/challenges'),
      next: extractList(block, 'Next planned work'),
    };
  });

  const summary = extractListAfter(md, '## Summary of Work Completed Across the Project');
  const limitations = extractListAfter(md, '## Honest Limitations to Mention in the Logbook or Viva');
  const finalStatement = extractParagraphAfter(md, '## Suggested Final Logbook Statement');

  return { title, projectTitle, student, studentId, programme, supervisor, weeks, summary, limitations, finalStatement };
}

function extractInline(block, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\*\\*${escaped}:\\*\\*\\s*(.+)`);
  return cleanText(regex.exec(block)?.[1] || '');
}

function extractSection(block, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\*\\*${escaped}:\\*\\*\\s*\\n+([\\s\\S]*?)(?=\\n\\*\\*[^\\n]+:\\*\\*|\\n---|$)`);
  return regex.exec(block)?.[1] || '';
}

function extractList(block, label) {
  const section = extractSection(block, label);
  const items = section
    .split('\n')
    .map(line => line.replace(/^\s*-\s*/, '').trim())
    .filter(Boolean)
    .map(cleanText);
  return items.length ? items : [cleanText(section)];
}

function extractListAfter(md, heading) {
  const start = md.indexOf(heading);
  if (start < 0) return [];
  const next = md.indexOf('\n## ', start + heading.length);
  const block = md.slice(start + heading.length, next > -1 ? next : md.length);
  return block
    .split('\n')
    .map(line => line.replace(/^\s*-\s*/, '').trim())
    .filter(line => line && !line.startsWith('---'))
    .map(cleanText);
}

function extractParagraphAfter(md, heading) {
  const start = md.indexOf(heading);
  if (start < 0) return '';
  const block = md.slice(start + heading.length);
  return cleanText(block.split('\n').filter(line => line.trim() && !line.startsWith('---')).join(' '));
}

function paragraph(text, opts = {}) {
  const style = opts.style ? `<w:pStyle w:val="${opts.style}"/>` : '';
  const bold = opts.bold ? '<w:b/>' : '';
  const italic = opts.italic ? '<w:i/>' : '';
  const size = opts.size || '22';
  const spacing = opts.spacing || '<w:spacing w:after="120" w:line="276" w:lineRule="auto"/>';
  return `<w:p>
    <w:pPr>${style}${spacing}</w:pPr>
    <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/>${bold}${italic}<w:sz w:val="${size}"/></w:rPr><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>
  </w:p>`;
}

function cell(content, width, opts = {}) {
  const fill = opts.fill ? `<w:shd w:fill="${opts.fill}"/>` : '';
  const bold = opts.bold ? '<w:b/>' : '';
  const size = opts.size || '18';
  const text = Array.isArray(content) ? content.filter(Boolean) : [content].filter(Boolean);
  const paragraphs = text.length
    ? text.map((item, index) => {
        const prefix = opts.bullets && text.length > 1 ? '• ' : '';
        return `<w:p><w:pPr><w:spacing w:after="${index === text.length - 1 ? 0 : 60}" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/>${bold}<w:sz w:val="${size}"/></w:rPr><w:t xml:space="preserve">${escapeXml(prefix + item)}</w:t></w:r></w:p>`;
      }).join('')
    : paragraph('', { size });
  return `<w:tc>
    <w:tcPr>
      <w:tcW w:w="${width}" w:type="dxa"/>
      <w:tcMar><w:top w:w="80" w:type="dxa"/><w:left w:w="80" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tcMar>
      ${fill}
    </w:tcPr>
    ${paragraphs}
  </w:tc>`;
}

function row(cells, opts = {}) {
  const header = opts.header ? '<w:trPr><w:tblHeader/></w:trPr>' : '';
  return `<w:tr>${header}${cells.join('')}</w:tr>`;
}

function table(rowsXml, widths) {
  const grid = widths.map(w => `<w:gridCol w:w="${w}"/>`).join('');
  return `<w:tbl>
    <w:tblPr>
      <w:tblStyle w:val="TableGrid"/>
      <w:tblW w:w="15000" w:type="dxa"/>
      <w:tblBorders>
        <w:top w:val="single" w:sz="4" w:space="0" w:color="777777"/>
        <w:left w:val="single" w:sz="4" w:space="0" w:color="777777"/>
        <w:bottom w:val="single" w:sz="4" w:space="0" w:color="777777"/>
        <w:right w:val="single" w:sz="4" w:space="0" w:color="777777"/>
        <w:insideH w:val="single" w:sz="4" w:space="0" w:color="AAAAAA"/>
        <w:insideV w:val="single" w:sz="4" w:space="0" w:color="AAAAAA"/>
      </w:tblBorders>
      <w:tblLayout w:type="fixed"/>
    </w:tblPr>
    <w:tblGrid>${grid}</w:tblGrid>
    ${rowsXml.join('')}
  </w:tbl>`;
}

function buildDocument(data) {
  const widths = [900, 1600, 1900, 3000, 2600, 2800, 2200];
  const headerCells = ['Week', 'Period', 'Main Focus', 'Work Completed', 'Evidence/Output', 'Reflection/Challenges', 'Next Planned Work']
    .map((h, i) => cell(h, widths[i], { bold: true, fill: 'D9EAF7', size: '18' }));
  const rows = [row(headerCells, { header: true })];
  for (const week of data.weeks) {
    rows.push(row([
      cell(week.week, widths[0], { bold: true, size: '18' }),
      cell(week.period, widths[1], { size: '18' }),
      cell(week.mainFocus, widths[2], { size: '18' }),
      cell(week.workCompleted, widths[3], { bullets: true, size: '16' }),
      cell(week.evidence, widths[4], { bullets: true, size: '16' }),
      cell(week.reflection, widths[5], { bullets: true, size: '16' }),
      cell(week.next, widths[6], { bullets: true, size: '16' }),
    ]));
  }

  const body = [
    paragraph(data.title, { style: 'Title', bold: true, size: '32', spacing: '<w:spacing w:after="180"/>' }),
    paragraph(`Project title: ${data.projectTitle}`, { size: '22' }),
    paragraph(`Student: ${data.student}`, { size: '22' }),
    paragraph(`Student ID: ${data.studentId}`, { size: '22' }),
    paragraph(`Programme: ${data.programme}`, { size: '22' }),
    paragraph(`Supervisor: ${data.supervisor}`, { size: '22' }),
    paragraph('Evidence Basis', { style: 'Heading1', bold: true, size: '26', spacing: '<w:spacing w:before="160" w:after="120"/>' }),
    paragraph('This weekly diary was prepared using the research proposal, interim report, Git commit history, final implementation evidence, testing outputs, documentation work, and final report preparation materials.', { size: '22' }),
    paragraph('Weekly Progress Table', { style: 'Heading1', bold: true, size: '26', spacing: '<w:spacing w:before="160" w:after="120"/>' }),
    table(rows, widths),
    paragraph('Summary of Work Completed', { style: 'Heading1', bold: true, size: '26', spacing: '<w:spacing w:before="200" w:after="120"/>' }),
    ...data.summary.map(item => paragraph(`• ${item}`, { size: '22' })),
    paragraph('Honest Limitations', { style: 'Heading1', bold: true, size: '26', spacing: '<w:spacing w:before="200" w:after="120"/>' }),
    ...data.limitations.map(item => paragraph(`• ${item}`, { size: '22' })),
    paragraph('Final Logbook Statement', { style: 'Heading1', bold: true, size: '26', spacing: '<w:spacing w:before="200" w:after="120"/>' }),
    paragraph(data.finalStatement, { size: '22' }),
    '<w:sectPr><w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>',
  ].join('\n');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${body}</w:body>
</w:document>`;
}

function writePackage(documentXml) {
  fs.rmSync(buildDir, { recursive: true, force: true });
  fs.mkdirSync(path.join(buildDir, '_rels'), { recursive: true });
  fs.mkdirSync(path.join(buildDir, 'word', '_rels'), { recursive: true });
  fs.mkdirSync(path.join(buildDir, 'docProps'), { recursive: true });

  fs.writeFileSync(path.join(buildDir, '[Content_Types].xml'), `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`);

  fs.writeFileSync(path.join(buildDir, '_rels', '.rels'), `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`);

  fs.writeFileSync(path.join(buildDir, 'word', '_rels', 'document.xml.rels'), `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`);

  fs.writeFileSync(path.join(buildDir, 'word', 'document.xml'), documentXml);
  fs.writeFileSync(path.join(buildDir, 'word', 'styles.xml'), `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:sz w:val="32"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:sz w:val="26"/></w:rPr></w:style>
  <w:style w:type="table" w:styleId="TableGrid"><w:name w:val="Table Grid"/></w:style>
</w:styles>`);
  fs.writeFileSync(path.join(buildDir, 'docProps', 'core.xml'), `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>RICA Weekly Project Diary Logbook</dc:title>
  <dc:creator>H. M. G. C. A. Herath</dc:creator>
  <cp:lastModifiedBy>RICA</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">2026-08-30T00:00:00Z</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">2026-08-30T00:00:00Z</dcterms:modified>
</cp:coreProperties>`);
  fs.writeFileSync(path.join(buildDir, 'docProps', 'app.xml'), `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>RICA</Application></Properties>`);

  fs.rmSync(outputPath, { force: true });
  const zipPath = path.join(outDir, 'RICA_Weekly_Project_Diary_Logbook.zip');
  fs.rmSync(zipPath, { force: true });
  execFileSync('powershell.exe', [
    '-NoProfile',
    '-Command',
    `$ErrorActionPreference='Stop'; Add-Type -AssemblyName System.IO.Compression; Add-Type -AssemblyName System.IO.Compression.FileSystem; $root='${buildDir.replace(/'/g, "''")}'; $zipPath='${zipPath.replace(/'/g, "''")}'; $zip=[System.IO.Compression.ZipFile]::Open($zipPath,[System.IO.Compression.ZipArchiveMode]::Create); Get-ChildItem -LiteralPath $root -Recurse -File | ForEach-Object { $rel=$_.FullName.Substring($root.Length+1).Replace([char]92,'/'); [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip,$_.FullName,$rel) | Out-Null }; $zip.Dispose(); Move-Item -LiteralPath $zipPath -Destination '${outputPath.replace(/'/g, "''")}' -Force`
  ], { stdio: 'inherit' });
}

const md = fs.readFileSync(inputPath, 'utf8');
const data = parseDiary(md);
if (data.weeks.length !== 25) {
  throw new Error(`Expected 25 weeks, parsed ${data.weeks.length}`);
}
writePackage(buildDocument(data));
console.log(`Wrote ${outputPath}`);

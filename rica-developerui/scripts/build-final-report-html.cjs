const fs = require('fs');
const path = require('path');

const root = process.cwd();
const input = path.join(root, 'docs', 'final-report', 'final-report.md');
const output = path.join(root, 'docs', 'final-report', 'RICA_Final_Year_Individual_Report.html');

const source = fs.readFileSync(input, 'utf8').replace(/\r\n/g, '\n');
const lines = source.split('\n');

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function inline(value) {
  let text = escapeHtml(value);
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  return text;
}

function isTableLine(line) {
  return /^\|.*\|$/.test(line.trim());
}

function isTableSeparator(line) {
  return /^\|\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(line.trim());
}

function renderTable(tableLines) {
  const rows = tableLines
    .filter(line => !isTableSeparator(line))
    .map(line => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim()));
  if (!rows.length) return '';
  const header = rows[0];
  const body = rows.slice(1);
  return [
    '<table>',
    '<thead><tr>' + header.map(cell => `<th>${inline(cell)}</th>`).join('') + '</tr></thead>',
    '<tbody>',
    ...body.map(row => '<tr>' + row.map(cell => `<td>${inline(cell)}</td>`).join('') + '</tr>'),
    '</tbody></table>',
  ].join('\n');
}

const html = [];
let paragraph = [];
let list = null;
let code = null;
let table = [];

function flushParagraph() {
  if (!paragraph.length) return;
  html.push(`<p>${inline(paragraph.join(' '))}</p>`);
  paragraph = [];
}

function flushList() {
  if (!list) return;
  html.push(`<${list.type}>`);
  for (const item of list.items) html.push(`<li>${inline(item)}</li>`);
  html.push(`</${list.type}>`);
  list = null;
}

function flushTable() {
  if (!table.length) return;
  html.push(renderTable(table));
  table = [];
}

function closeBlocks() {
  flushParagraph();
  flushList();
  flushTable();
}

for (const line of lines) {
  const trimmed = line.trim();

  if (code !== null) {
    if (trimmed.startsWith('```')) {
      html.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
      code = null;
    } else {
      code.push(line);
    }
    continue;
  }

  if (trimmed.startsWith('```')) {
    closeBlocks();
    code = [];
    continue;
  }

  if (!trimmed) {
    closeBlocks();
    continue;
  }

  if (trimmed === '---') {
    closeBlocks();
    html.push('<div class="page-break"></div>');
    continue;
  }

  const imageMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
  if (imageMatch) {
    closeBlocks();
    const alt = escapeHtml(imageMatch[1]);
    const rel = imageMatch[2].replace(/\//g, path.sep);
    const src = path.resolve(path.dirname(input), rel);
    html.push(`<figure><img src="${src}" alt="${alt}"><figcaption>${alt}</figcaption></figure>`);
    continue;
  }

  if (isTableLine(trimmed)) {
    flushParagraph();
    flushList();
    table.push(trimmed);
    continue;
  }

  flushTable();

  const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
  if (heading) {
    closeBlocks();
    const level = Math.min(heading[1].length, 3);
    html.push(`<h${level}>${inline(heading[2])}</h${level}>`);
    continue;
  }

  const blockquote = trimmed.match(/^>\s?(.*)$/);
  if (blockquote) {
    closeBlocks();
    html.push(`<blockquote>${inline(blockquote[1])}</blockquote>`);
    continue;
  }

  const bullet = trimmed.match(/^-\s+(.+)$/);
  if (bullet) {
    flushParagraph();
    if (!list || list.type !== 'ul') {
      flushList();
      list = { type: 'ul', items: [] };
    }
    list.items.push(bullet[1]);
    continue;
  }

  const numbered = trimmed.match(/^\d+\.\s+(.+)$/);
  if (numbered) {
    flushParagraph();
    if (!list || list.type !== 'ol') {
      flushList();
      list = { type: 'ol', items: [] };
    }
    list.items.push(numbered[1]);
    continue;
  }

  flushList();
  paragraph.push(trimmed);
}

closeBlocks();

const documentHtml = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>RICA Final Year Individual Report</title>
<style>
@page { margin: 1in; }
body { font-family: "Times New Roman", serif; font-size: 12pt; line-height: 1.5; color: #000; }
h1 { font-size: 16pt; font-weight: bold; margin: 18pt 0 10pt; page-break-after: avoid; }
h2 { font-size: 14pt; font-weight: bold; margin: 14pt 0 8pt; page-break-after: avoid; }
h3 { font-size: 12pt; font-weight: bold; margin: 12pt 0 6pt; page-break-after: avoid; }
p { margin: 0 0 8pt; text-align: justify; }
ul, ol { margin: 0 0 8pt 0.35in; padding-left: 0.2in; }
li { margin: 0 0 4pt; }
table { border-collapse: collapse; width: 100%; margin: 8pt 0 12pt; page-break-inside: auto; }
th, td { border: 1px solid #777; padding: 5pt 6pt; vertical-align: top; }
th { background: #f2f2f2; font-weight: bold; }
blockquote { margin: 8pt 0 10pt 0.25in; padding-left: 10pt; border-left: 3pt solid #999; color: #333; }
code { font-family: "Courier New", monospace; font-size: 10pt; }
pre { border: 1px solid #aaa; background: #f7f7f7; padding: 8pt; white-space: pre-wrap; margin: 8pt 0 12pt; }
figure { margin: 12pt 0; page-break-inside: avoid; text-align: center; }
img { max-width: 6.2in; height: auto; }
figcaption { font-size: 11pt; margin-top: 5pt; font-style: italic; }
.page-break { page-break-after: always; }
</style>
</head>
<body>
${html.join('\n')}
</body>
</html>`;

fs.writeFileSync(output, documentHtml, 'utf8');
console.log(output);

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync, cpSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const submissionDir = path.join(rootDir, 'submission');
mkdirSync(submissionDir, { recursive: true });

console.log('📦 Starting Submission Artifacts Builder...');

// ---------------------------------------------------------------------------
// Markdown Parser
// ---------------------------------------------------------------------------
function mdToHtml(md) {
  const lines = md.split(/\r?\n/);
  const out = [];
  let inCode = false;
  let codeLang = '';
  let codeLines = [];
  let inTable = false;
  let tableRows = [];
  let inList = false;
  let listType = 'ul';

  const flushList = () => {
    if (inList) {
      out.push(`</${listType}>`);
      inList = false;
    }
  };

  const flushTable = () => {
    if (inTable) {
      if (tableRows.length > 0) {
        out.push('<div class="table-container"><table>');
        // Filter out separator row (e.g. |---|---|)
        const headerRow = tableRows[0];
        out.push('<thead><tr>');
        for (const cell of headerRow) {
          out.push(`<th>${inlineFormat(cell.trim())}</th>`);
        }
        out.push('</tr></thead><tbody>');

        for (let r = 1; r < tableRows.length; r++) {
          const row = tableRows[r];
          // Check if it's separator row
          if (row.every(c => /^:?-+:?$/.test(c.trim()))) continue;
          out.push('<tr>');
          for (const cell of row) {
            out.push(`<td>${inlineFormat(cell.trim())}</td>`);
          }
          out.push('</tr>');
        }
        out.push('</tbody></table></div>');
      }
      inTable = false;
      tableRows = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code block toggle
    if (line.trim().startsWith('```')) {
      if (inCode) {
        out.push(`<pre><code class="language-${codeLang}">${escapeHtml(codeLines.join('\n'))}</code></pre>`);
        inCode = false;
        codeLines = [];
      } else {
        flushList();
        flushTable();
        inCode = true;
        codeLang = line.trim().slice(3).trim();
      }
      continue;
    }

    if (inCode) {
      codeLines.push(line);
      continue;
    }

    // Horizontal Rule
    if (/^---$|^\*\*\*$|^___$/.test(line.trim())) {
      flushList();
      flushTable();
      out.push('<hr />');
      continue;
    }

    // Table row
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      flushList();
      inTable = true;
      const parts = line.trim().slice(1, -1).split('|');
      tableRows.push(parts);
      continue;
    } else {
      flushTable();
    }

    // Headings
    const hMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (hMatch) {
      flushList();
      const level = hMatch[1].length;
      const text = inlineFormat(hMatch[2]);
      out.push(`<h${level}>${text}</h${level}>`);
      continue;
    }

    // Blockquote
    if (line.trim().startsWith('>')) {
      flushList();
      const content = line.trim().replace(/^>\s?/, '');
      out.push(`<blockquote><p>${inlineFormat(content)}</p></blockquote>`);
      continue;
    }

    // Unordered list
    const ulMatch = line.match(/^(\s*)[-*+]\s+(.*)$/);
    if (ulMatch) {
      if (!inList || listType !== 'ul') {
        flushList();
        inList = true;
        listType = 'ul';
        out.push('<ul>');
      }
      out.push(`<li>${inlineFormat(ulMatch[2])}</li>`);
      continue;
    }

    // Ordered list
    const olMatch = line.match(/^(\s*)[0-9]+\.\s+(.*)$/);
    if (olMatch) {
      if (!inList || listType !== 'ol') {
        flushList();
        inList = true;
        listType = 'ol';
        out.push('<ol>');
      }
      out.push(`<li>${inlineFormat(olMatch[2])}</li>`);
      continue;
    }

    // Blank line
    if (!line.trim()) {
      flushList();
      continue;
    }

    // Normal paragraph
    flushList();
    out.push(`<p>${inlineFormat(line)}</p>`);
  }

  flushList();
  flushTable();

  return out.join('\n');
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function inlineFormat(text) {
  let s = text;
  // Bold
  s = s.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Italic
  s = s.replace(/\*(.*?)\*/g, '<em>$1</em>');
  // Inline code
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Links
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  // Badges & highlights
  s = s.replace(/✅/g, '<span class="badge badge-pass">PASS</span>');
  s = s.replace(/T2/g, '<span class="badge badge-t2">T2</span>');
  s = s.replace(/T3/g, '<span class="badge badge-t3">T3</span>');
  s = s.replace(/T1/g, '<span class="badge badge-t1">T1</span>');
  s = s.replace(/T0/g, '<span class="badge badge-t0">T0</span>');
  s = s.replace(/BLOCK/g, '<span class="badge badge-block">BLOCK</span>');
  return s;
}

// ---------------------------------------------------------------------------
// Document Template
// ---------------------------------------------------------------------------
function renderDocHtml(title, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      --font-mono: 'JetBrains Mono', Consolas, "Courier New", monospace;
      --color-bg: #ffffff;
      --color-text: #1e293b;
      --color-muted: #64748b;
      --color-primary: #0f172a;
      --color-brand: #0284c7;
      --color-accent: #10b981;
      --border-color: #e2e8f0;
    }

    * { box-sizing: border-box; }
    body {
      font-family: var(--font-sans);
      color: var(--color-text);
      background: var(--color-bg);
      line-height: 1.65;
      font-size: 11pt;
      margin: 0;
      padding: 40px 60px;
      max-width: 960px;
      margin-left: auto;
      margin-right: auto;
    }

    h1, h2, h3, h4 {
      color: var(--color-primary);
      font-weight: 700;
      line-height: 1.3;
      margin-top: 1.8em;
      margin-bottom: 0.6em;
    }

    h1 {
      font-size: 24pt;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 12px;
      margin-top: 0;
    }

    h2 {
      font-size: 16pt;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 8px;
    }

    h3 { font-size: 13pt; }
    h4 { font-size: 11pt; }

    p, ul, ol {
      margin-top: 0;
      margin-bottom: 1em;
    }

    ul, ol { padding-left: 24px; }
    li { margin-bottom: 0.35em; }

    a {
      color: var(--color-brand);
      text-decoration: none;
    }
    a:hover { text-decoration: underline; }

    code {
      font-family: var(--font-mono);
      font-size: 0.9em;
      background: #f1f5f9;
      color: #0f172a;
      padding: 2px 5px;
      border-radius: 4px;
      border: 1px solid #e2e8f0;
    }

    pre {
      background: #0f172a;
      color: #f8fafc;
      padding: 16px 20px;
      border-radius: 8px;
      overflow-x: auto;
      font-size: 9.5pt;
      line-height: 1.5;
      margin: 1.2em 0;
    }

    pre code {
      background: transparent;
      color: inherit;
      padding: 0;
      border: none;
      font-family: var(--font-mono);
    }

    blockquote {
      border-left: 4px solid var(--color-brand);
      background: #f8fafc;
      margin: 1.2em 0;
      padding: 12px 20px;
      border-radius: 0 6px 6px 0;
      color: #334155;
      font-style: italic;
    }

    blockquote p { margin: 0; }

    .table-container {
      width: 100%;
      overflow-x: auto;
      margin: 1.5em 0;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9.5pt;
      line-height: 1.45;
    }

    th, td {
      border: 1px solid var(--border-color);
      padding: 8px 12px;
      text-align: left;
      vertical-align: top;
    }

    th {
      background: #f8fafc;
      color: #0f172a;
      font-weight: 600;
      border-bottom: 2px solid #cbd5e1;
    }

    tr:nth-child(even) td { background: #fafafa; }

    hr {
      border: none;
      border-top: 1px solid var(--border-color);
      margin: 2em 0;
    }

    .badge {
      display: inline-block;
      font-size: 8pt;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 12px;
      font-family: var(--font-sans);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .badge-pass { background: #dcfce7; color: #15803d; border: 1px solid #86efac; }
    .badge-t2   { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
    .badge-t3   { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
    .badge-t1   { background: #e0f2fe; color: #075985; border: 1px solid #bae6fd; }
    .badge-t0   { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }
    .badge-block{ background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }

    @media print {
      body {
        padding: 0;
        font-size: 9.5pt;
        max-width: 100%;
      }
      @page {
        margin: 16mm 14mm;
        size: A4;
      }
      h1 { font-size: 20pt; }
      h2 { font-size: 14pt; page-break-after: avoid; }
      h3 { font-size: 12pt; page-break-after: avoid; }
      pre, table, blockquote { page-break-inside: avoid; }
      .badge { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      th { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    }
  </style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Presentation Deck 16:9 Slide Template
// ---------------------------------------------------------------------------
function renderDeckHtml(slidesMd) {
  // Split on "## Slide X:"
  const rawSections = slidesMd.split(/^## Slide /m);
  const slides = [];

  for (let i = 1; i < rawSections.length; i++) {
    const raw = rawSections[i];
    const firstLineEnd = raw.indexOf('\n');
    const headerTitle = raw.slice(0, firstLineEnd).trim();
    const content = raw.slice(firstLineEnd).trim();
    slides.push({ title: 'Slide ' + headerTitle, content });
  }

  // Also include the Q&A Defense section as a final slide
  const qnaIndex = slidesMd.indexOf('## 🛡️ Judge Q&A Defense Matrix');
  let qnaSlideHtml = '';
  if (qnaIndex !== -1) {
    const qnaContent = slidesMd.slice(qnaIndex);
    qnaSlideHtml = `
      <section class="slide qna-slide">
        <header class="slide-header">
          <div class="brand">GUARDIAN WALLET · DEFENSE MATRIX</div>
          <div class="slide-num">SLIDE 12 (BACKUP)</div>
        </header>
        <div class="slide-body">
          ${mdToHtml(qnaContent)}
        </div>
        <footer class="slide-footer">
          <span>2026 Shenzhen International FinTechathon · Topic F</span>
          <span>https://github.com/beingmushfiq/Guardian-Wallet</span>
        </footer>
      </section>
    `;
  }

  const slidesHtml = slides.map((s, idx) => {
    // Separate speaker notes if present
    const speakerNotesMatch = s.content.match(/\*\*Speaker Script[^*]*\*\*(.*?)(?=\n\n|$)/s);
    let bodyContent = s.content;
    let speakerNote = '';
    if (speakerNotesMatch) {
      speakerNote = speakerNotesMatch[0];
      bodyContent = bodyContent.replace(speakerNotesMatch[0], '');
    }

    return `
      <section class="slide">
        <header class="slide-header">
          <div class="brand">
            <span class="hud-pill">● SECURE</span>
            GUARDIAN WALLET · FINTECHATHON 2026
          </div>
          <div class="slide-num">0${idx + 1} / 12</div>
        </header>
        <div class="slide-title-bar">
          <h2>${escapeHtml(s.title)}</h2>
        </div>
        <div class="slide-body">
          ${mdToHtml(bodyContent)}
        </div>
        ${speakerNote ? `<div class="speaker-notes">${mdToHtml(speakerNote)}</div>` : ''}
        <footer class="slide-footer">
          <span>Topic F: Agent Wallet · Base Sepolia (Chain ID 84532)</span>
          <span>"The AI proposes; deterministic policy and an on-chain vault dispose."</span>
        </footer>
      </section>
    `;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Guardian Wallet — Presentation Deck</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <style>
    @page {
      size: 16in 9in;
      margin: 0;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      background: #060911;
      font-family: 'Inter', -apple-system, sans-serif;
      color: #f1f5f9;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .slide {
      width: 16in;
      height: 9in;
      page-break-after: always;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 0.65in 0.9in;
      background: radial-gradient(circle at 10% 20%, rgba(16, 185, 129, 0.08) 0%, transparent 40%),
                  radial-gradient(circle at 90% 80%, rgba(99, 102, 241, 0.1) 0%, transparent 45%),
                  linear-gradient(135deg, #090e18 0%, #0c1424 100%);
      border-bottom: 2px solid #1e293b;
      position: relative;
      overflow: hidden;
    }

    .slide-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13pt;
      font-weight: 600;
      letter-spacing: 1.5px;
      color: #94a3b8;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      padding-bottom: 12px;
    }

    .hud-pill {
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.4);
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 10pt;
      margin-right: 12px;
    }

    .slide-title-bar h2 {
      margin: 12px 0 0 0;
      font-size: 28pt;
      font-weight: 800;
      color: #ffffff;
      background: linear-gradient(90deg, #ffffff 0%, #38bdf8 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .slide-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      margin: 15px 0;
      font-size: 14pt;
      line-height: 1.55;
      color: #cbd5e1;
    }

    .slide-body p { margin-bottom: 0.8em; }
    .slide-body ul { margin: 0.5em 0; padding-left: 1.5em; }
    .slide-body li { margin-bottom: 0.5em; }
    .slide-body strong { color: #ffffff; }

    .slide-body table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12pt;
      background: rgba(15, 23, 42, 0.7);
      border-radius: 8px;
      overflow: hidden;
      margin: 15px 0;
    }

    .slide-body th, .slide-body td {
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 10px 16px;
      text-align: left;
    }

    .slide-body th {
      background: rgba(30, 41, 59, 0.8);
      color: #38bdf8;
      font-weight: 700;
    }

    .slide-body code {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.85em;
      background: rgba(30, 41, 59, 0.8);
      color: #38bdf8;
      padding: 2px 6px;
      border-radius: 4px;
    }

    .slide-body pre {
      background: rgba(15, 23, 42, 0.9);
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 14px;
      border-radius: 8px;
      font-size: 11pt;
    }

    .speaker-notes {
      background: rgba(15, 23, 42, 0.75);
      border-left: 4px solid #10b981;
      padding: 10px 16px;
      border-radius: 0 6px 6px 0;
      font-size: 11pt;
      color: #94a3b8;
      margin-top: 10px;
    }

    .speaker-notes p { margin: 0; }
    .speaker-notes strong { color: #34d399; }

    .slide-footer {
      display: flex;
      justify-content: space-between;
      font-size: 11pt;
      color: #64748b;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      padding-top: 10px;
    }

    .badge {
      display: inline-block;
      font-size: 10pt;
      font-weight: 700;
      padding: 3px 9px;
      border-radius: 12px;
      text-transform: uppercase;
    }
    .badge-pass { background: rgba(34, 197, 94, 0.2); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.5); }
    .badge-t2   { background: rgba(34, 197, 94, 0.2); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.5); }
    .badge-t3   { background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.5); }
    .badge-t1   { background: rgba(56, 189, 248, 0.2); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.5); }
    .badge-t0   { background: rgba(148, 163, 184, 0.2); color: #cbd5e1; border: 1px solid rgba(148, 163, 184, 0.5); }
    .badge-block{ background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.5); }
  </style>
</head>
<body>
${slidesHtml}
${qnaSlideHtml}
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Execution Pipeline
// ---------------------------------------------------------------------------
async function main() {
  const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

  // 1. Technical Documentation (HTML + PDF)
  console.log('📄 Rendering technical_documentation.html...');
  const techMd = readFileSync(path.join(rootDir, 'docs', 'technical-documentation.md'), 'utf8');
  const techBody = mdToHtml(techMd);
  const techHtml = renderDocHtml('Guardian Wallet — Technical Documentation', techBody);
  const techHtmlPath = path.join(rootDir, 'technical_documentation.html');
  writeFileSync(techHtmlPath, techHtml, 'utf8');
  writeFileSync(path.join(submissionDir, 'technical_documentation.html'), techHtml, 'utf8');

  console.log('🖨️ Printing technical_documentation.pdf via Chrome Headless...');
  const techPdfPath = path.join(rootDir, 'technical_documentation.pdf');
  execSync(`"${CHROME_PATH}" --headless=new --disable-gpu --no-pdf-header-footer --print-to-pdf="${techPdfPath}" "${techHtmlPath}"`);
  cpSync(techPdfPath, path.join(submissionDir, 'technical_documentation.pdf'));

  // 2. Security Self-Assessment (HTML + PDF)
  console.log('📄 Rendering security_self_assessment.html...');
  const secMd = readFileSync(path.join(rootDir, 'docs', 'security-self-assessment.md'), 'utf8');
  const secBody = mdToHtml(secMd);
  const secHtml = renderDocHtml('Guardian Wallet — Security Self-Assessment Report', secBody);
  const secHtmlPath = path.join(rootDir, 'security_self_assessment.html');
  writeFileSync(secHtmlPath, secHtml, 'utf8');
  writeFileSync(path.join(submissionDir, 'security_self_assessment.html'), secHtml, 'utf8');

  console.log('🖨️ Printing security_self_assessment.pdf via Chrome Headless...');
  const secPdfPath = path.join(rootDir, 'security_self_assessment.pdf');
  execSync(`"${CHROME_PATH}" --headless=new --disable-gpu --no-pdf-header-footer --print-to-pdf="${secPdfPath}" "${secHtmlPath}"`);
  cpSync(secPdfPath, path.join(submissionDir, 'security_self_assessment.pdf'));

  // 3. Presentation Deck (HTML + PDF)
  console.log('📄 Rendering presentation_deck.html...');
  const deckMd = readFileSync(path.join(rootDir, 'docs', 'presentation-deck.md'), 'utf8');
  const deckHtml = renderDeckHtml(deckMd);
  const deckHtmlPath = path.join(rootDir, 'presentation_deck.html');
  writeFileSync(deckHtmlPath, deckHtml, 'utf8');
  writeFileSync(path.join(submissionDir, 'presentation_deck.html'), deckHtml, 'utf8');

  console.log('🖨️ Printing presentation_deck.pdf via Chrome Headless (16:9)...');
  const deckPdfPath = path.join(rootDir, 'presentation_deck.pdf');
  execSync(`"${CHROME_PATH}" --headless=new --disable-gpu --no-pdf-header-footer --print-to-pdf="${deckPdfPath}" "${deckHtmlPath}"`);
  cpSync(deckPdfPath, path.join(submissionDir, 'presentation_deck.pdf'));

  // 4. Synchronize all submission folder items
  console.log('📂 Synchronizing submission directory assets...');
  cpSync(path.join(rootDir, 'SUBMISSION_EMAIL.md'), path.join(submissionDir, 'SUBMISSION_EMAIL.md'));
  if (existsSync(path.join(rootDir, 'demo_video.mp4'))) {
    cpSync(path.join(rootDir, 'demo_video.mp4'), path.join(submissionDir, 'demo_video.mp4'));
  }
  if (existsSync(path.join(rootDir, 'execution_evidence.zip'))) {
    cpSync(path.join(rootDir, 'execution_evidence.zip'), path.join(submissionDir, 'execution_evidence.zip'));
  }
  if (existsSync(path.join(rootDir, 'evidence'))) {
    cpSync(path.join(rootDir, 'evidence'), path.join(submissionDir, 'evidence'), { recursive: true });
  }

  console.log('✨ All submission deliverables built successfully!');
}

main().catch(err => {
  console.error('❌ Build failed:', err);
  process.exit(1);
});

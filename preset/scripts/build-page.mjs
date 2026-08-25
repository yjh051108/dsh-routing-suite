/**
 * Zero-dependency markdown → HTML for the blog page (GitHub Pages).
 * Supports the subset used in blog.md: headings, tables, code fences,
 * lists, blockquotes, bold, inline code, links, hr.
 */
import { readFileSync, writeFileSync } from 'node:fs'

const md = readFileSync(new URL('../docs/blog.md', import.meta.url), 'utf8')
const lines = md.split(/\r?\n/)

function inline(text) {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
}

const html = []
let inCode = false
let codeBuf = []
let inTable = false
let tableBuf = []
let listType = null // '-' | '1.' | null

function flushCode() {
  if (codeBuf.length) {
    html.push(`<pre><code>${codeBuf.join('\n').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`)
    codeBuf = []
  }
}

function flushTable() {
  if (tableBuf.length) {
    const rows = tableBuf.map((r) => `<tr>${r.map((c) => `<td>${inline(c.trim())}</td>`).join('')}</tr>`)
    html.push(`<table>${rows.join('')}</table>`)
    tableBuf = []
  }
}

function flushList() {
  if (listType) {
    html.push(listType === '-' ? '</ul>' : '</ol>')
    listType = null
  }
}

for (const raw of lines) {
  const line = raw.replace(/\s+$/, '')
  if (line.startsWith('```')) {
    if (inCode) { inCode = false; flushCode() }
    else { flushTable(); flushList(); inCode = true }
    continue
  }
  if (inCode) { codeBuf.push(line); continue }

  if (/^\|.*\|$/.test(line) && line.replace(/\|/g, '').trim() !== '') {
    if (!inTable) { flushList(); inTable = true; tableBuf = [] }
    if (!/^\|[\s:|-]+\|$/.test(line)) {
      const cells = line.split('|').slice(1, -1)
      tableBuf.push(cells)
    }
    continue
  }
  if (inTable && line.trim() === '') { inTable = false; flushTable(); continue }
  if (inTable) continue

  const h = line.match(/^(#{1,6})\s+(.*)$/)
  if (h) { flushList(); html.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); continue }
  if (/^---+\s*$/.test(line)) { flushList(); html.push('<hr>'); continue }
  if (/^>\s?/.test(line)) { flushList(); html.push(`<blockquote>${inline(line.replace(/^>\s?/, ''))}</blockquote>`); continue }
  if (/^[-*]\s+/.test(line)) {
    if (listType !== '-') { flushList(); listType = '-'; html.push('<ul>') }
    html.push(`<li>${inline(line.replace(/^[-*]\s+/, ''))}</li>`); continue
  }
  if (/^\d+\.\s+/.test(line)) {
    if (listType !== '1.') { flushList(); listType = '1.'; html.push('<ol>') }
    html.push(`<li>${inline(line.replace(/^\d+\.\s+/, ''))}</li>`); continue
  }
  flushList()
  if (line.trim() === '') { html.push('</p>'.replace('</p>', '')); continue }
  html.push(`<p>${inline(line)}</p>`)
}
flushCode(); flushTable(); flushList()

const css = `
:root { --bg:#0d1117; --fg:#e6edf3; --muted:#8b949e; --accent:#58a6ff; --border:#30363d; }
* { box-sizing: border-box; }
body { background:var(--bg); color:var(--fg); font:16px/1.7 -apple-system,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif; margin:0; }
main { max-width:860px; margin:0 auto; padding:48px 24px 96px; }
h1 { font-size:2em; border-bottom:1px solid var(--border); padding-bottom:.3em; }
h2 { font-size:1.5em; margin-top:2em; border-bottom:1px solid var(--border); padding-bottom:.2em; }
h3 { font-size:1.2em; margin-top:1.6em; }
a { color:var(--accent); text-decoration:none; } a:hover { text-decoration:underline; }
code { background:#161b22; border:1px solid var(--border); border-radius:6px; padding:.1em .4em; font-size:.9em; }
pre { background:#161b22; border:1px solid var(--border); border-radius:8px; padding:16px; overflow-x:auto; }
pre code { border:none; padding:0; }
table { border-collapse:collapse; width:100%; margin:1em 0; font-size:.92em; }
td,th { border:1px solid var(--border); padding:8px 12px; text-align:left; }
blockquote { border-left:4px solid var(--border); margin:1em 0; padding:.2em 1em; color:var(--muted); }
hr { border:none; border-top:1px solid var(--border); margin:2em 0; }
ul,ol { padding-left:1.6em; }
`

writeFileSync(new URL('../docs/index.html', import.meta.url),
  `<!doctype html><html lang="zh"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>从「神鬼二相性」到「深度效率」</title><style>${css}</style></head><body><main>${html.join('\n')}<hr><p style="color:var(--muted)">router-standard · 实测研究（P1–P30）· <a href="https://github.com/yjh051108/dsh-router-standard">GitHub</a></p></main></body></html>`,
  'utf8')

console.log('docs/index.html generated,', html.length, 'blocks')

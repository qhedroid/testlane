'use client'

import { useRef, useState, type ReactNode } from 'react'

/**
 * Minimal rich-text editing for the frontend prototype (Area E).
 *
 * Storage stays a plain string containing a deliberately small Markdown
 * subset: **bold**, *italic*, `inline code`, [link](url), "- " bullet lists
 * and "1. " numbered lists. No schema change, no external editor dependency.
 * Rendering avoids dangerouslySetInnerHTML — the parser emits React nodes.
 */

const INLINE_PATTERN = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = []
  let last = 0
  let i = 0
  for (const match of text.matchAll(INLINE_PATTERN)) {
    const idx = match.index ?? 0
    if (idx > last) nodes.push(text.slice(last, idx))
    const token = match[0]
    const key = `${keyPrefix}-${i}`
    if (token.startsWith('**')) {
      nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>)
    } else if (token.startsWith('`')) {
      nodes.push(<code key={key} className="rtf-code">{token.slice(1, -1)}</code>)
    } else if (token.startsWith('*')) {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>)
    } else {
      const m = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(token)
      if (m) {
        const href = /^(https?:\/\/|mailto:)/i.test(m[2]) ? m[2] : `https://${m[2]}`
        nodes.push(
          <a key={key} href={href} target="_blank" rel="noopener noreferrer" className="rtf-link">
            {m[1]}
          </a>,
        )
      } else {
        nodes.push(token)
      }
    }
    last = idx + token.length
    i += 1
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

/** Read-only renderer for the markdown subset. */
export function RichTextView({ source, className }: { source?: string; className?: string }) {
  if (!source || !source.trim()) return null
  const lines = source.split(/\r?\n/)
  const blocks: ReactNode[] = []
  let listItems: { ordered: boolean; content: ReactNode[] }[] = []

  const flushList = (key: string) => {
    if (listItems.length === 0) return
    const ordered = listItems[0].ordered
    const items = listItems.map((li, i) => <li key={i}>{li.content}</li>)
    blocks.push(ordered ? <ol key={key} className="rtf-list">{items}</ol> : <ul key={key} className="rtf-list">{items}</ul>)
    listItems = []
  }

  lines.forEach((line, i) => {
    const bullet = /^\s*[-*]\s+(.*)$/.exec(line)
    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line)
    if (bullet) {
      if (listItems.length > 0 && listItems[0].ordered) flushList(`l-${i}`)
      listItems.push({ ordered: false, content: renderInline(bullet[1], `b-${i}`) })
      return
    }
    if (numbered) {
      if (listItems.length > 0 && !listItems[0].ordered) flushList(`l-${i}`)
      listItems.push({ ordered: true, content: renderInline(numbered[1], `n-${i}`) })
      return
    }
    flushList(`l-${i}`)
    if (line.trim() === '') return
    blocks.push(<p key={`p-${i}`} className="rtf-p">{renderInline(line, `p-${i}`)}</p>)
  })
  flushList('l-end')

  return <div className={`rtf-view${className ? ` ${className}` : ''}`}>{blocks}</div>
}

interface RichTextFieldProps {
  value: string
  onChange: (value: string) => void
  rows?: number
  placeholder?: string
  className?: string
}

/** Markdown textarea with a compact formatting toolbar and Edit/Preview toggle. */
export function RichTextField({ value, onChange, rows = 3, placeholder, className }: RichTextFieldProps) {
  const [preview, setPreview] = useState(false)
  const taRef = useRef<HTMLTextAreaElement>(null)

  function wrapSelection(before: string, after: string, placeholderText: string) {
    const ta = taRef.current
    if (!ta) return
    const start = ta.selectionStart ?? 0
    const end = ta.selectionEnd ?? 0
    const selected = value.slice(start, end) || placeholderText
    const next = value.slice(0, start) + before + selected + after + value.slice(end)
    onChange(next)
    requestAnimationFrame(() => {
      ta.focus()
      ta.setSelectionRange(start + before.length, start + before.length + selected.length)
    })
  }

  function prefixLines(prefix: (i: number) => string) {
    const ta = taRef.current
    if (!ta) return
    const start = ta.selectionStart ?? 0
    const end = ta.selectionEnd ?? 0
    const lineStart = value.lastIndexOf('\n', start - 1) + 1
    const lineEndIdx = value.indexOf('\n', end)
    const lineEnd = lineEndIdx === -1 ? value.length : lineEndIdx
    const segment = value.slice(lineStart, lineEnd)
    const prefixed = segment
      .split('\n')
      .map((l, i) => (l.trim() ? `${prefix(i)}${l.replace(/^\s*([-*]|\d+[.)])\s+/, '')}` : l))
      .join('\n')
    onChange(value.slice(0, lineStart) + prefixed + value.slice(lineEnd))
    requestAnimationFrame(() => ta.focus())
  }

  return (
    <div className={`rtf-field${className ? ` ${className}` : ''}`}>
      <div className="rtf-toolbar">
        <button type="button" className="rtf-btn" title="Bold (**text**)" disabled={preview} onClick={() => wrapSelection('**', '**', 'bold')}>
          <strong>B</strong>
        </button>
        <button type="button" className="rtf-btn" title="Italic (*text*)" disabled={preview} onClick={() => wrapSelection('*', '*', 'italic')}>
          <em>I</em>
        </button>
        <button type="button" className="rtf-btn" title="Inline code (`code`)" disabled={preview} onClick={() => wrapSelection('`', '`', 'code')}>
          {'</>'}
        </button>
        <button type="button" className="rtf-btn" title="Bullet list" disabled={preview} onClick={() => prefixLines(() => '- ')}>
          <i className="ti ti-list" style={{ fontSize: 12 }} />
        </button>
        <button type="button" className="rtf-btn" title="Numbered list" disabled={preview} onClick={() => prefixLines((i) => `${i + 1}. `)}>
          <i className="ti ti-list-numbers" style={{ fontSize: 12 }} />
        </button>
        <button type="button" className="rtf-btn" title="Link ([text](url))" disabled={preview} onClick={() => wrapSelection('[', '](https://)', 'link text')}>
          <i className="ti ti-link" style={{ fontSize: 12 }} />
        </button>
        <span className="rtf-spacer" />
        <button type="button" className={`rtf-btn rtf-mode${!preview ? ' on' : ''}`} onClick={() => setPreview(false)}>
          Edit
        </button>
        <button type="button" className={`rtf-btn rtf-mode${preview ? ' on' : ''}`} onClick={() => setPreview(true)}>
          Preview
        </button>
      </div>
      {preview ? (
        <div className="rtf-preview" style={{ minHeight: rows * 18 }}>
          {value.trim() ? <RichTextView source={value} /> : <span className="rtf-empty">Nothing to preview</span>}
        </div>
      ) : (
        <textarea
          ref={taRef}
          className="rtf-textarea"
          rows={rows}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  )
}

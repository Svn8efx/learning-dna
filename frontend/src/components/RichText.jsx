import React from 'react';

/**
 * Renders plain text the way a learner expects to read it: paragraphs, bullet and numbered lists,
 * `inline code` and ``` fenced code blocks (which scroll sideways instead of breaking the layout).
 * It only formats what is already in the text; it never adds content.
 */
function inline(text, keyPrefix) {
  return text.split(/(`[^`]+`)/g).map((part, i) =>
    part.startsWith('`') && part.endsWith('`') && part.length > 2
      ? <code key={`${keyPrefix}-${i}`} className="rounded bg-sunken px-1.5 py-0.5 text-[0.9em]">{part.slice(1, -1)}</code>
      : <React.Fragment key={`${keyPrefix}-${i}`}>{part}</React.Fragment>
  );
}

export default function RichText({ text = '', className = '' }) {
  const blocks = [];
  const lines = String(text).replace(/\r\n/g, '\n').split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim().startsWith('```')) {
      const code = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith('```')) { code.push(lines[i]); i += 1; }
      i += 1;
      blocks.push({ type: 'code', text: code.join('\n') });
    } else if (/^\s*[-•*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-•*]\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*[-•*]\s+/, '')); i += 1; }
      blocks.push({ type: 'ul', items });
    } else if (/^\s*\d+[.)]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*\d+[.)]\s+/, '')); i += 1; }
      blocks.push({ type: 'ol', items });
    } else if (line.trim() === '') {
      i += 1;
    } else {
      const para = [];
      while (i < lines.length && lines[i].trim() !== '' && !/^\s*([-•*]|\d+[.)])\s+/.test(lines[i]) && !lines[i].trim().startsWith('```')) { para.push(lines[i]); i += 1; }
      blocks.push({ type: 'p', text: para.join(' ') });
    }
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {blocks.map((b, idx) => {
        if (b.type === 'code') {
          return <pre key={idx} className="overflow-x-auto rounded-lg border border-line bg-sunken p-4 text-sm leading-relaxed" tabIndex={0}><code>{b.text}</code></pre>;
        }
        if (b.type === 'ul') return <ul key={idx} className="list-disc space-y-1.5 pl-6">{b.items.map((t, j) => <li key={j}>{inline(t, `${idx}-${j}`)}</li>)}</ul>;
        if (b.type === 'ol') return <ol key={idx} className="list-decimal space-y-1.5 pl-6">{b.items.map((t, j) => <li key={j}>{inline(t, `${idx}-${j}`)}</li>)}</ol>;
        return <p key={idx}>{inline(b.text, String(idx))}</p>;
      })}
    </div>
  );
}

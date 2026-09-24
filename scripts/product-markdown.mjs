// Some document exports wrap every line in an inline code span, including
// Markdown headings, tables, and code fences. Remove only that outer wrapper.
function unwrapLine(line) {
  const match = line.match(/^([ \t]*)(`+)(.*?)(`+)([ \t]*)$/);
  if (!match || match[2] !== match[4]) return line;
  let content = match[3];
  if (content.startsWith(' ') && content.endsWith(' ') && content.trim()) {
    content = content.slice(1, -1);
  }
  return match[1] + content + match[5];
}

export function normalizeProductMarkdown(source) {
  // The two Enterprise RL Python samples also contain exported emphasis around
  // imports and comments. Restore them as code, never as document instructions.
  const text = source.replace(
    /(^#{2,6} Test Code\s*\n)([\s\S]*?)(?=^#{1,6} |^---[ \t]*$|$(?![\s\S]))/gm,
    (_, heading, code) => {
      if (/^\s*(`{3,}|~{3,})/.test(code)) return heading + code;
      const lines = code
        .trim()
        .split('\n')
        .map((line) => {
          const plain = line.replace(/\*(`+[^\n]*?`+)\*/g, '$1');
          return plain.replace(/(`+)(.*?)\1/g, '$2').trimEnd();
        });
      return `${heading}\n\`\`\`python\n${lines.join('\n')}\n\`\`\`\n\n`;
    },
  );

  let parentDepth = 1;
  let outlineShift = 0;
  let fence;
  const lines = text.split('\n').map((line) => {
    if (fence) {
      const content = fence.exported ? unwrapLine(line).trimEnd() : line;
      if (new RegExp(`^ {0,3}${fence.marker}{${fence.length},}\\s*$`).test(content)) {
        fence = undefined;
      }
      return content;
    }

    let content = unwrapLine(line);
    const exported = content !== line;
    const opening = content.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (opening) {
      fence = { marker: opening[1][0], length: opening[1].length, exported };
      return content.trimEnd();
    }

    const heading = content.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      let depth = heading[1].length;
      if (exported) {
        // Sample documents stay beneath the surrounding task/document heading.
        depth = Math.min(6, parentDepth + depth);
      } else {
        // A second top-level document (Environment Snapshot) belongs beneath
        // the product title, together with its existing subsections.
        if (depth === 1) outlineShift = 1;
        depth = Math.min(6, depth + outlineShift);
        parentDepth = depth;
      }
      content = `${'#'.repeat(depth)} ${heading[2]}`;
    }
    // Restore escaped inline code exported in otherwise normal prose.
    content = content.replace(/\\`([^`\n]+)\\`/g, '`$1`');
    // Only normalize separators outside code; literal code must stay intact.
    return /^---[ \t]*$/.test(content) ? '\n---\n' : content;
  });

  if (fence) throw new Error('Unclosed code fence in product document');
  return lines.join('\n');
}

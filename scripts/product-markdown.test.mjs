import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizeProductMarkdown } from './product-markdown.mjs';

test('exported sample Markdown regains headings, lists, tables and nested inline code', () => {
  const result = normalizeProductMarkdown(
    [
      '## Samples',
      '',
      '### Task 1',
      '',
      '`# Sample document`',
      '',
      '`## Workspace`',
      '',
      '``- Edit `strategy.py` and preserve **all** other files.``',
      '',
      '`| File | Purpose |`',
      '`| --- | --- |`',
      '``| `strategy.py` | Agent |``',
    ].join('\n'),
  );
  assert.match(result, /#### Sample document/);
  assert.match(result, /##### Workspace/);
  assert.match(result, /- Edit `strategy.py` and preserve \*\*all\*\* other files\./);
  assert.match(result, /\| File \| Purpose \|\n\| --- \| --- \|\n\| `strategy.py` \| Agent \|/);
});

test('exported code fences retain code indentation and literal content', () => {
  const result = normalizeProductMarkdown(
    [
      '### Task',
      '',
      '```` ```python ````',
      '`def sample():`',
      '   `return "# literal heading"`',
      '```` ``` ````',
    ].join('\n'),
  );
  assert.match(result, /```python\ndef sample\(\):\n   return "# literal heading"\n```/);
  const original = '## Code\n\n```text\n`literal backticks`\n# unchanged\n---\n```';
  assert.equal(normalizeProductMarkdown(original), original);
});

test('highlighted Python samples become complete code blocks, not prose or headings', () => {
  const result = normalizeProductMarkdown(
    [
      '#### Test Code',
      '',
      '*`import`* `pytest`',
      '',
      '*`# Keep this comment`*',
      '`def test_example():`',
      '   `assert 1 == 1`',
      '',
      '---',
      '',
      '### Next task',
    ].join('\n'),
  );
  assert.match(
    result,
    /```python\nimport pytest\n\n# Keep this comment\ndef test_example\(\):\n   assert 1 == 1\n```/,
  );
  assert.match(result, /```\n+---\n+### Next task$/);
  assert.equal((result.match(/```python/g) || []).length, 1);
});

test('environment snapshot is subordinate to the product, and embedded headings to its chapters', () => {
  const result = normalizeProductMarkdown(
    [
      '## Samples',
      '',
      '# Environment Snapshot',
      '',
      '## Policy',
      '',
      '`# Policy document`',
      '',
      '`## Chapter`',
      '',
      '`### Article`',
    ].join('\n'),
  );
  assert.match(result, /^## Environment Snapshot$/m);
  assert.match(result, /^### Policy$/m);
  assert.match(result, /^#### Policy document$/m);
  assert.match(result, /^##### Chapter$/m);
  assert.match(result, /^###### Article$/m);
  assert.doesNotMatch(result, /^# /m);
});

test('source Enterprise report preserves its evaluation tables and benchmark figures', async () => {
  const source = await readFile(
    new URL('../resource/product/general/ENTERPRISE_RL.md', import.meta.url),
    'utf8',
  );
  const result = normalizeProductMarkdown(source.replace(/^#{1,2} [^\n]+\n/, ''));
  assert.match(result, /^## Design Philosophy$/m);
  assert.match(result, /^## Experiment$/m);
  assert.match(result, /^## Result Analysis$/m);
  assert.equal(
    (result.match(/^\| Model \| pass@1 \| pass@4 \| pass@8 \| Avg Steps \|$/gm) || []).length,
    4,
  );
  assert.match(
    result,
    /^\| Model \| AutomationBench-AA \| Tau3-Banking-AA \| EnterpriseRL pass@1 \|$/m,
  );
  assert.match(result, /!\[AutomationBench-AA[^\]]*\]\(figs\/AutomationBench-AA\.png\)/);
  assert.match(result, /!\[Tau3-Banking-AA[^\]]*\]\(figs\/Tau3-Banking-AA\.png\)/);
  assert.doesNotMatch(result, /^`+#?\s*\|/m);
});

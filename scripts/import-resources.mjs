import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { normalizeProductMarkdown } from './product-markdown.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const { email } = JSON.parse(await readFile(path.join(root, 'src/data/contact.json'), 'utf8'));
const write = async (name, body) => {
  const target = path.join(root, name);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, body);
};
const sources = [
  ['deepswe', 'resource/product/coding/DEEPSWE.md'],
  ['prd-to-repo', 'resource/product/coding/PRD_TO_REPO.md'],
  ['auto-research', 'resource/product/coding/AUTORESEACH.md'],
  ['enterprise-rl', 'resource/product/general/ENTERPRISE_RL.md'],
];
// Exported horizontal rules sometimes immediately follow a paragraph. Without
// a blank line Markdown treats that entire paragraph as a setext heading.
const normalizeRules = (text) => text.replace(/([^\n])\n---[ \t]*\n/g, '$1\n\n---\n');
for (const [slug, filename] of sources) {
  let text = await readFile(path.join(root, filename), 'utf8');
  const directory = filename.split('/')[2];
  const category = directory.charAt(0).toUpperCase() + directory.slice(1);
  const title = text.match(/^#{1,2}\s+([^\n]+)/)?.[1].trim();
  if (!title) throw new Error(`Missing document title: ${filename}`);
  text = text.replace(/^#{1,2}[^\n]+\n+/, '').replace(/^---\s*/, '');
  text = normalizeProductMarkdown(text);
  text = text.replace(
    /Please (?:contact us|refer to Google Drive)\./g,
    `Please [contact us](mailto:${email}?subject=${encodeURIComponent(`${title} — Samples`)}).`,
  );
  // Publish figures beside their source document, including links to the originals.
  const figures = new Set(
    [...text.matchAll(/\]\((figs\/[\w.-]+\.(?:png|jpe?g|webp|svg))\)/gi)].map((match) => match[1]),
  );
  for (const figure of figures) {
    const url = `/images/products/${slug}/${path.basename(figure)}`;
    await write(`public${url}`, await readFile(path.join(root, path.dirname(filename), figure)));
    text = text.replaceAll(`](${figure})`, `](${url})`);
  }
  await write(
    `src/content/products/${slug}.md`,
    `---\nslug: ${slug}\ntitle: ${JSON.stringify(title)}\ncategory: ${JSON.stringify(category)}\n---\n\n${text.trim()}\n`,
  );
}

let blog = await readFile(
  path.join(root, 'resource/blog/For Expert: Guiding LLMs with Your Expertise.md'),
  'utf8',
);
const imagePattern = /\[image1\]:\s*<?data:image\/png;base64,([A-Za-z0-9+/=]+)>?/;
const embedded = blog.match(imagePattern);
if (embedded) {
  const image = Buffer.from(embedded[1], 'base64');
  await write('public/images/expert-guide.png', image);
  await write('src/assets/expert-guide.png', image);
  blog = blog.replace(imagePattern, '');
}
// Replace the exported table of contents with the page's accessible, generated TOC.
blog = blog.slice(blog.indexOf('# 1 Where Your Expertise Fits'));
blog = blog.replace(/\s*\{#[^\n]+\}/g, '');
blog = blog.replace(/^(#{1,5}) /gm, '#$1 ');
blog = normalizeRules(blog);
const words = blog.split(/\s+/).length;
await write(
  'src/content/blog/expert-guide.md',
  `---\nslug: guiding-llms-with-your-expertise\nreadingMinutes: ${Math.ceil(words / 220)}\n---\n\n${blog.trim()}\n`,
);
console.log('Imported 1 complete article, its illustration, and 4 product documents.');

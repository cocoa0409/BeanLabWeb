import contact from './contact.json';

export const site = {
  name: 'BEAN LABS',
  legalName: 'BEAN LABS PTE. LTD.',
  description:
    'The data powering the final leap to AGI. Expert data and real-world environments for training and evaluating AI agents.',
  ...contact,
  location: 'Singapore',
};

// Full display titles are taken directly from the supplied product documents.
export const products = [
  {
    slug: 'deepswe',
    name: 'DeepSWE',
    publishedDate: '2026-08-04',
    description:
      'Expert-curated repository-level tasks with isolated environments and executable F2P/P2P verifiers.',
  },
  {
    slug: 'prd-to-repo',
    name: 'PRD-to-Repo',
    publishedDate: '2026-06-03',
    description:
      'PRD-based software development tasks, evaluated through end-to-end functional testing.',
  },
  {
    slug: 'auto-research',
    name: 'Auto Research',
    publishedDate: '2026-08-13',
    description: 'Optimization tasks that measure how agents learn from environment feedback.',
  },
  {
    slug: 'enterprise-rl',
    name: 'Enterprise RL',
    publishedDate: '2026-09-25',
    description:
      'Enterprise workflows with interconnected systems, policy constraints, and role-based permissions.',
  },
] as const;

export const article = {
  slug: 'guiding-llms-with-your-expertise',
  title: 'Guiding LLMs with Your Expertise',
  description: 'A practical guide to designing prompts, rubrics, and training data for LLMs.',
  author: 'Joe Ray Wang',
  authorEmail: 'joe@thebeanos.com',
  publishedDate: '2026-09-08',
};

// Keep dates stable across visits and builds; change them for editorial updates.
// ISO dates sort without timezone conversion.
export function newestFirst<T extends { publishedDate: string; slug: string }>(
  entries: readonly T[],
) {
  return [...entries].sort(
    (a, b) => b.publishedDate.localeCompare(a.publishedDate) || a.slug.localeCompare(b.slug),
  );
}

export const articles = newestFirst([article]);

export const roles = [
  { title: 'Research Scientist' },
  { title: 'Research Intern' },
  { title: 'Agent Systems Engineer' },
  { title: 'Infrastructure Engineer' },
  { title: 'Domain Expert' },
  { title: 'Expert Community Lead' },
];

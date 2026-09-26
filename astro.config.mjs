import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://www.kultalab.com',
  output: 'static',
  trailingSlash: 'always',
  devToolbar: { enabled: false },
  markdown: { shikiConfig: { theme: 'github-light' } },
});

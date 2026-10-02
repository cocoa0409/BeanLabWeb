import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://www.kultalab.com',
  output: 'static',
  trailingSlash: 'always',
  devToolbar: { enabled: false },
  markdown: { shikiConfig: { theme: 'github-light' } },
  integrations: [
    {
      name: 'local-about-page',
      hooks: {
        'astro:config:setup': ({ command, injectRoute, updateConfig }) => {
          const includeAbout = command === 'dev' || process.env.BEANLABS_LOCAL_ABOUT === '1';
          if (includeAbout) {
            injectRoute({
              pattern: '/about',
              entrypoint: './src/pages-local/about.astro',
              prerender: true,
            });
          }
          updateConfig({
            vite: {
              define: { 'import.meta.env.BEANLABS_LOCAL_ABOUT': JSON.stringify(includeAbout) },
            },
          });
        },
      },
    },
  ],
});

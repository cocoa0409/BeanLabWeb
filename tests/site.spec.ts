import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const documentRoutes = [
  '/blog/guiding-llms-with-your-expertise/',
  '/product/deepswe/',
  '/product/prd-to-repo/',
  '/product/auto-research/',
  '/product/enterprise-rl/',
];
const routes = ['/', '/blog/', '/product/', '/about/', '/joinus/', ...documentRoutes];

for (const width of [1440, 390, 320]) {
  test(`All pages render, resolve their links and fit a ${width}px viewport`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    for (const route of routes) {
      const response = await page.goto(route);
      expect(response?.status(), route).toBe(200);
      await expect(page.locator('main h1')).toHaveCount(1);
      await expect(page.locator('main h1')).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        `Overflow: ${route}`,
      ).toBe(true);
      const brokenAnchors = await page
        .locator('a[href^="#"]')
        .evaluateAll((links) =>
          links
            .map((link) => link.getAttribute('href')!)
            .filter(
              (href) => href !== '#' && !document.getElementById(decodeURIComponent(href.slice(1))),
            ),
        );
      expect(brokenAnchors, `Broken anchors: ${route}`).toEqual([]);
    }
    expect(errors).toEqual([]);
  });
}

test('The navigation links and every product open the right page', async ({ page }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Main navigation', exact: true });
  await expect(nav.getByRole('link')).toHaveText([
    'Home',
    'Blog',
    'Product',
    'About us',
    'Join us',
  ]);
  await expect(page.locator('.brand')).toHaveText('BEAN LABS');
  await nav.getByRole('link', { name: 'Product', exact: true }).click();
  await expect(page).toHaveURL(/\/product\/$/);
  const cards = page.locator('.product-card');
  await expect(cards).toHaveCount(4);
  for (const card of await cards.all()) {
    const href = await card.getAttribute('href');
    await expect(card.locator('.category-tag')).toHaveText(
      href?.includes('enterprise-rl') ? 'General' : 'Coding',
    );
  }
  for (const href of await cards.evaluateAll((links) =>
    links.map((a) => a.getAttribute('href')!),
  )) {
    await page.goto(href);
    await expect(page.locator('.prose')).toContainText(/environment|task/i);
    if (href === '/product/deepswe/') {
      await expect(
        page.locator('.prose').getByRole('link', { name: 'contact us', exact: true }),
      ).toHaveAttribute('href', /^mailto:contact@thebeanos\.com\?subject=.+/);
    }
  }
});

test('Mobile navigation supports keyboard closing and direct navigation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const menu = page.locator('.menu-toggle');
  await menu.click();
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await expect(menu).toBeFocused();
  await menu.click();
  await page
    .getByRole('navigation', { name: 'Mobile navigation' })
    .getByRole('link', { name: /Join us/ })
    .click();
  await expect(page).toHaveURL(/\/joinus\/$/);
  await expect(page.getByRole('button', { name: 'Open navigation' })).toHaveAttribute(
    'aria-expanded',
    'false',
  );
});

test('Career roles are plain text and applications use the talent inbox', async ({ page }) => {
  await page.goto('/joinus/');
  await expect(page.locator('h1')).toHaveText('Join BEAN LABS.');
  await expect(page.locator('.minimal-roles li')).toHaveText([
    'Research Scientist',
    'Research Intern',
    'Agent Systems Engineer',
    'Infrastructure Engineer',
    'Domain Expert',
    'Expert Community Lead',
  ]);
  await expect(
    page.locator('.minimal-roles a, .minimal-roles button, .minimal-roles svg'),
  ).toHaveCount(0);
  await expect(
    page.getByRole('link', { name: 'talents@thebeanos.com', exact: true }),
  ).toHaveAttribute('href', 'mailto:talents@thebeanos.com');
});

test('The supplied article is complete and its contents links work', async ({ page }) => {
  await page.goto('/blog/');
  await expect(page.locator('.article-author')).toHaveText('Joe Ray Wang');
  await expect(page.locator('.author-email')).toHaveText('joe@thebeanos.com');
  await expect(page.locator('.author-email')).toHaveJSProperty('tagName', 'SPAN');
  await expect(page.locator('.author-avatar')).toHaveCSS('border-radius', '50%');
  await expect
    .poll(() =>
      page
        .locator('.author-avatar img')
        .evaluate((image) => (image as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
  await page.locator('.article-summary').click();
  await expect(page.locator('.reader-author')).toHaveText('Joe Ray Wang');
  await expect(page.locator('.author-email')).toHaveText('joe@thebeanos.com');
  await expect(page.locator('.author-avatar')).toHaveCSS('border-radius', '50%');
  const contents = page.getByRole('navigation', { name: 'On this page', exact: true });
  await expect(contents.getByRole('link')).toHaveCount(4);
  await contents.getByRole('link').last().click();
  await expect(page).toHaveURL(/#4-designing-a-high-quality-dataset$/);
  await expect(page.locator('.prose')).toContainText('Your Final Goal');
  expect((await page.locator('.prose').innerText()).length).toBeGreaterThan(20000);
  const image = page.locator('.expert-figure img');
  await image.scrollIntoViewIfNeeded();
  await expect
    .poll(() => image.evaluate((img) => (img as HTMLImageElement).naturalWidth))
    .toBeGreaterThan(0);
});

test('Home stays within one screen on desktop, phone, and landscape', async ({ page }) => {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1280, height: 720 },
    { width: 390, height: 844 },
    { width: 320, height: 568 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    expect(
      await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1),
    ).toBe(true);
    await expect(page.locator('.world-title')).toBeInViewport({ ratio: 1 });
    await expect(page.locator('.world-caption')).toBeInViewport({ ratio: 1 });
    await expect(page.locator('.world-footer')).toBeInViewport({ ratio: 1 });
    const introSize = await page
      .locator('.world-intro')
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    await expect(page.locator('.world-intro')).toHaveText(
      'The data powering the final leap to AGI.',
    );
    expect(introSize).toBeGreaterThanOrEqual(20);
    expect(
      await page
        .locator('.world-product-link')
        .evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
    ).toBeGreaterThanOrEqual(22);
  }
});

test('The visual animates automatically without growth controls', async ({ page }) => {
  await page.goto('/');
  const field = page.locator('.data-field');
  await expect(field).toHaveClass(/field-ready/);
  await expect(field).toHaveAttribute('data-motion', 'playing');
  await expect(field).toHaveAttribute('data-artwork', 'silver-interference');
  await expect(field).toHaveAttribute('data-particles', 'ready');
  await expect(page.locator('.field-fallback')).toHaveAttribute(
    'src',
    '/artwork/silver-interference.webp',
  );
  await expect(page.getByText(/hold to grow|restart growth/i)).toHaveCount(0);
  await expect(page.locator('.grow-control, .world-interaction')).toHaveCount(0);
  const before = Number(await field.getAttribute('data-frame'));
  await expect
    .poll(() => field.getAttribute('data-frame').then(Number))
    .toBeGreaterThan(before + 4);
  await page.getByRole('button', { name: 'Pause animation', exact: true }).click();
  await expect(field).toHaveAttribute('data-motion', 'paused');
  const frame = await field.getAttribute('data-frame');
  const canvas = page.locator('.field-canvas');
  const hash = async () =>
    createHash('sha256')
      .update(await canvas.screenshot())
      .digest('hex');
  const paused = await hash();
  await page.waitForTimeout(250);
  expect(await field.getAttribute('data-frame')).toBe(frame);
  expect(await hash()).toBe(paused);
  await page.getByRole('button', { name: 'Resume animation', exact: true }).click();
  await expect
    .poll(() => field.getAttribute('data-frame').then(Number))
    .toBeGreaterThan(Number(frame) + 4);
  expect(await hash()).not.toBe(paused);
});

test('Reduced motion and disabled JavaScript retain a complete static page', async ({
  page,
  browser,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const field = page.locator('.data-field');
  await expect(field).toHaveAttribute('data-motion', 'reduced');
  const frame = await field.getAttribute('data-frame');
  await page.waitForTimeout(250);
  expect(await field.getAttribute('data-frame')).toBe(frame);
  await expect(page.locator('.motion-toggle')).toBeHidden();
  const noJs = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const staticPage = await noJs.newPage();
  await staticPage.goto('http://127.0.0.1:4322/');
  await expect(staticPage.locator('.world-title h1')).toBeVisible();
  await expect(staticPage.locator('.field-fallback')).toBeVisible();
  await expect(
    staticPage.getByRole('navigation', { name: 'Main navigation', exact: true }),
  ).toBeVisible();
  await expect(staticPage.locator('.motion-toggle')).toBeHidden();
  expect(await staticPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
    true,
  );
  await noJs.close();
});

test('The artwork survives graphics context loss and restores motion', async ({ page }) => {
  await page.goto('/');
  const field = page.locator('.data-field');
  await expect(field).toHaveClass(/field-ready/);
  const contextControl = await page.locator('.field-canvas').evaluateHandle((element) => {
    const gl = (element as HTMLCanvasElement).getContext('webgl')!;
    const extension = gl.getExtension('WEBGL_lose_context')!;
    extension.loseContext();
    return extension;
  });
  await expect(field).toHaveAttribute('data-motion', 'static');
  await expect(page.locator('.field-fallback')).toBeVisible();
  await expect(page.locator('.motion-toggle')).toBeHidden();
  await contextControl.evaluate((extension) => extension.restoreContext());
  await contextControl.dispose();
  await expect(field).toHaveClass(/field-ready/);
  await expect(field).toHaveAttribute('data-motion', 'playing');
  const frame = Number(await field.getAttribute('data-frame'));
  await expect.poll(() => field.getAttribute('data-frame').then(Number)).toBeGreaterThan(frame + 2);
});

test('Motion preferences can change while the page stays open', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const field = page.locator('.data-field');
  await expect(field).toHaveAttribute('data-motion', 'reduced');
  await expect(page.locator('.field-fallback')).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(field).toHaveClass(/field-ready/);
  await expect(field).toHaveAttribute('data-motion', 'playing');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(field).toHaveAttribute('data-motion', 'reduced');
  await expect(page.locator('.motion-toggle')).toBeHidden();
  const frame = await field.getAttribute('data-frame');
  await page.waitForTimeout(250);
  expect(await field.getAttribute('data-frame')).toBe(frame);
});

test('Every page keeps the same light palette and pixel display font', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
  for (const route of routes) {
    await page.goto(route);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(245, 245, 240)');
    const font = await page.locator('h1').evaluate((el) => getComputedStyle(el).fontFamily);
    expect(font).toContain('Bean Pixel');
    await expect(page.locator('footer')).toContainText('BEAN LABS');
  }
});

test('Product titles and section order match the supplied documents', async ({ page }) => {
  const sources = [
    ['deepswe', 'resource/product/coding/DEEPSWE.md'],
    ['prd-to-repo', 'resource/product/coding/PRD_TO_REPO.md'],
    ['auto-research', 'resource/product/coding/AUTORESEACH.md'],
    ['enterprise-rl', 'resource/product/general/ENTERPRISE_RL.md'],
  ];
  for (const [slug, file] of sources) {
    const original = await readFile(file, 'utf8');
    const [title, ...headings] = [...original.matchAll(/^#{1,6} (.+)$/gm)].map((match) =>
      match[1].replace(/\\([.])/g, '$1'),
    );
    await page.goto(`/product/${slug}/`);
    await expect(page.locator('h1')).toHaveText(title);
    await expect(page.locator('.reader-category')).toHaveText(
      file.includes('/coding/') ? 'Coding' : 'General',
    );
    // Embedded sample documents add their own nested headings. The original
    // outer sections must still appear in order, with a single page-level h1.
    const rendered = await page.locator('.prose :is(h2, h3, h4, h5, h6)').allTextContents();
    let position = 0;
    for (const heading of headings) {
      const index = rendered.indexOf(heading, position);
      expect(index, `${slug}: ${heading}`).toBeGreaterThanOrEqual(position);
      position = index + 1;
    }
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('.prose')).not.toContainText('{#');
    await expect(page.locator('.product-facts, .product-detail-hero, .next-product')).toHaveCount(
      0,
    );
    expect((await page.locator('.prose').innerText()).length).toBeGreaterThan(
      original.length * 0.85,
    );
  }
});

for (const route of [
  '/',
  '/blog/',
  '/product/',
  '/about/',
  '/joinus/',
  '/blog/guiding-llms-with-your-expertise/',
  '/product/auto-research/',
  '/product/prd-to-repo/',
  '/product/enterprise-rl/',
]) {
  test(`Core accessibility: ${route}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(route);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(
      results.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
      })),
    ).toEqual([]);
  });
}

for (const width of [1440, 390]) {
  test(`Navigation preserves the running scene and fades only its veil at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/');
    const field = page.locator('.data-field');
    await expect(field).toHaveAttribute('data-motion', 'playing');
    const scene = await page.evaluateHandle(() => {
      const canvas = document.querySelector<HTMLCanvasElement>('.field-canvas')!;
      const state = {
        canvas,
        gl: canvas.getContext('webgl'),
        width: canvas.width,
        height: canvas.height,
        opacities: [] as number[],
      };
      document.addEventListener('astro:after-swap', () => {
        const start = performance.now();
        const sample = () => {
          state.opacities.push(
            Number(getComputedStyle(document.querySelector('.field-veil')!).opacity),
          );
          if (performance.now() - start < 500) requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
      });
      return state;
    });
    const navigate = async (name: string, path: string) => {
      const frame = Number(await field.getAttribute('data-frame'));
      if (width < 761) await page.getByRole('button', { name: 'Open navigation' }).click();
      const nav = page.getByRole('navigation', {
        name: width < 761 ? 'Mobile navigation' : 'Main navigation',
        exact: true,
      });
      await nav.getByRole('link', { name, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await expect
        .poll(() => field.getAttribute('data-frame').then(Number))
        .toBeGreaterThan(frame + 2);
      expect(
        await scene.evaluate((state) => {
          const current = document.querySelector<HTMLCanvasElement>('.field-canvas')!;
          return (
            current === state.canvas &&
            current.getContext('webgl') === state.gl &&
            current.width === state.width &&
            current.height === state.height
          );
        }),
      ).toBe(true);
      await expect(page.locator('.data-field')).toHaveCount(1);
      await expect(field).toHaveClass(/field-ready/);
      await expect(page.locator('.field-fallback')).toHaveCSS('opacity', '0');
    };
    await navigate('Blog', '/blog/');
    await expect(page.locator('.field-veil')).toHaveCSS('opacity', '0.76');
    expect(await scene.evaluate((state) => state.opacities.some((v) => v > 0 && v < 0.75))).toBe(
      true,
    );
    await navigate('Product', '/product/');
    await page.locator('.product-card').first().click();
    await expect(page.locator('.reader')).toBeVisible();
    await expect(page.locator('.field-veil')).toHaveCSS('opacity', '0.91');
    await page.goBack();
    await expect(page).toHaveURL(/\/product\/$/);
    await page.goForward();
    await expect(page.locator('.reader')).toBeVisible();
    await navigate('Join us', '/joinus/');
    await navigate('About us', '/about/');
    await navigate('Home', '/');
    await expect(page.locator('.field-veil')).toHaveCSS('opacity', '0');
    expect(
      await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1),
    ).toBe(true);
    expect(await page.evaluate(() => performance.getEntriesByType('navigation').length)).toBe(1);
    expect(errors).toEqual([]);
    await scene.dispose();
  });
}

test('Paused artwork keeps the exact same frame and crop across page changes', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Pause animation', exact: true }).click();
  const field = page.locator('.data-field');
  const frame = await field.getAttribute('data-frame');
  const canvasHash = async () =>
    createHash('sha256')
      .update(
        await page.locator('.field-canvas').screenshot({
          style:
            'body > :not(.data-field), .field-wash, .field-veil { visibility: hidden !important; }',
        }),
      )
      .digest('hex');
  const initial = await canvasHash();
  for (const name of ['Blog', 'Product', 'About us', 'Join us', 'Home']) {
    await page.locator('.desktop-nav').getByRole('link', { name, exact: true }).click();
    await expect(page.locator('.desktop-nav a[aria-current="page"]')).toHaveText(name);
    await expect(field).toHaveAttribute('data-motion', 'paused');
    expect(await field.getAttribute('data-frame')).toBe(frame);
    expect(await canvasHash()).toBe(initial);
  }
  await page.getByRole('button', { name: 'Resume animation', exact: true }).click();
  await expect
    .poll(() => field.getAttribute('data-frame').then(Number))
    .toBeGreaterThan(Number(frame) + 3);
});

test('Article progress and mobile keyboard navigation reattach after route changes', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/product/');
  for (let visit = 0; visit < 2; visit++) {
    await page.getByRole('button', { name: 'Open navigation' }).click();
    const mobile = page.getByRole('navigation', { name: 'Mobile navigation' });
    await mobile.getByRole('link', { name: 'Blog', exact: true }).click();
    await expect(page).toHaveURL(/\/blog\/$/);
    await page.locator('.article-summary').click();
    await expect(page.locator('.reading-progress')).toBeAttached();
    await page.evaluate(() =>
      scrollTo(0, (document.documentElement.scrollHeight - innerHeight) / 2),
    );
    await expect
      .poll(() =>
        page
          .locator('.reading-progress')
          .evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).a),
      )
      .toBeGreaterThan(0.45);
    await expect(page.locator('.site-header')).toHaveClass(/scrolled/);
    await page.getByRole('button', { name: 'Open navigation' }).click();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Open navigation' })).toBeFocused();
    await page.getByRole('button', { name: 'Open navigation' }).click();
    await mobile.getByRole('link', { name: 'Product', exact: true }).click();
    await expect(page).toHaveURL(/\/product\/$/);
  }
});

test('Publication dates stay fixed, sort newest first, and match their detail pages', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const index of ['/blog/', '/product/']) {
    await page.goto(index);
    const entries = await page.locator('.minimal-article').evaluateAll((cards) =>
      cards.map((card) => ({
        href: (card.getAttribute('href') ?? card.querySelector('a')!.getAttribute('href'))!,
        date: card.querySelector('time')!.dateTime,
        label: card.querySelector('time')!.textContent!.trim(),
      })),
    );
    expect(entries.length).toBeGreaterThan(0);
    const dates = entries.map(({ date }) => date);
    expect(dates).toEqual([...dates].sort().reverse());
    for (const { href, date, label } of entries) {
      expect(date).toMatch(/^2026-\d{2}-\d{2}$/);
      expect(date >= '2026-06-03' && date <= '2026-09-25').toBe(true);
      expect(label).toBe(
        new Intl.DateTimeFormat('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          timeZone: 'UTC',
        })
          .formatToParts(new Date(`${date}T00:00:00Z`))
          .map((part) => (part.type === 'month' ? part.value.slice(0, 3) : part.value))
          .join('')
          .toUpperCase(),
      );
      await page.goto(href);
      await expect(page.locator('.reader-header time')).toHaveAttribute('datetime', date);
      await expect(page.locator('.reader-header time')).toHaveText(label);
    }
    await page.goto(index);
    expect(
      await page
        .locator('.minimal-article time')
        .evaluateAll((items) => items.map((item) => item.getAttribute('datetime'))),
    ).toEqual(dates);
  }
});

test('Every page uses black text, including dates, categories, links and code', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const route of routes) {
    await page.goto(route);
    const coloredText = await page.locator('body *').evaluateAll((elements) =>
      elements
        .filter((element) => {
          if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(element.tagName)) return false;
          if (
            ![...element.childNodes].some(
              (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
            )
          )
            return false;
          return (
            element.getClientRects().length > 0 &&
            getComputedStyle(element).visibility === 'visible'
          );
        })
        .map((element) => ({
          text: element.textContent?.trim().slice(0, 50),
          color: getComputedStyle(element).color,
        }))
        .filter(({ color }) => color !== 'rgb(0, 0, 0)'),
    );
    expect(coloredText, route).toEqual([]);
    const firstLink = page.locator('main a').first();
    await firstLink.hover();
    await expect(firstLink).toHaveCSS('color', 'rgb(0, 0, 0)');
  }
});

test('Blog and Product have sticky chapter navigation that follows scrolling and history', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const route of documentRoutes) {
    await page.goto(route);
    const toc = page.getByRole('navigation', { name: 'On this page', exact: true });
    await expect(toc).toBeVisible();
    await expect(page.locator('.reader-contents')).toBeHidden();
    const headings = page.locator(
      route.startsWith('/product/') ? '.prose :is(h2, h3)' : '.prose h2',
    );
    await expect(toc.getByRole('link')).toHaveText(await headings.allTextContents());
    const main = await page.locator('.reader-main').boundingBox();
    const sidebar = await toc.boundingBox();
    expect(sidebar!.x).toBeGreaterThan(main!.x + main!.width);
    const last = toc.getByRole('link').last();
    const href = await last.getAttribute('href');
    await last.click();
    await expect(last).toHaveAttribute('aria-current', 'location');
    expect(new URL(page.url()).hash).toBe(href);
    await expect(page.locator('.reader-sidebar')).toBeInViewport({ ratio: 1 });
    // Short final chapters can share the bottom scroll position. Move back to
    // the first section to verify scroll tracking independently of anchor clicks.
    await headings.first().evaluate((heading) => heading.scrollIntoView());
    await expect(toc.getByRole('link').first()).toHaveAttribute('aria-current', 'location');
    await page.goBack();
    await expect(toc.getByRole('link').first()).toHaveAttribute('aria-current', 'location');
  }
  await page.setViewportSize({ width: 1440, height: 390 });
  await page.goto('/blog/guiding-llms-with-your-expertise/');
  await page
    .locator('.prose h2')
    .last()
    .evaluate((heading) => heading.scrollIntoView());
  const active = page.locator('.reader-sidebar a[aria-current="location"]');
  await expect(active).toHaveAttribute('href', '#4-designing-a-high-quality-dataset');
  await expect(active).toBeInViewport({ ratio: 1 });
});

test('The directory keeps a visible progress bar while long contents scroll, and resets across pages', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 700 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/product/enterprise-rl/');
  await page.evaluate(() => document.fonts.ready);
  const sidebar = page.locator('.reader-sidebar');
  const indicator = sidebar.getByRole('progressbar', { name: 'Reading progress' });
  expect((await sidebar.boundingBox())!.width).toBeGreaterThanOrEqual(260);
  await expect(indicator).toHaveJSProperty('value', 0);
  const scrollToFraction = async (fraction: number) => {
    await page.evaluate((value) => {
      scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * value);
    }, fraction);
    await expect
      .poll(() => indicator.evaluate((el) => (el as HTMLProgressElement).value))
      .toBeCloseTo(fraction * 100, 1);
  };
  await scrollToFraction(0.5);
  await expect(indicator).toHaveAttribute('aria-valuetext', '50%');
  await expect(indicator).toBeInViewport({ ratio: 1 });
  await page.locator('.page-toc').evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  await expect(indicator).toBeInViewport({ ratio: 1 });
  await scrollToFraction(1);
  await expect(indicator).toHaveAttribute('aria-valuetext', '100%');
  await page
    .getByRole('navigation', { name: 'Main navigation', exact: true })
    .getByRole('link', { name: 'Blog', exact: true })
    .click();
  await expect(page.getByRole('progressbar')).toHaveCount(0);
  await page.locator('.article-summary').click();
  await expect(indicator).toHaveJSProperty('value', 0);
  await page.setViewportSize({ width: 390, height: 844 });
  const mobileIndicator = page.locator('.reader-contents summary').getByRole('progressbar');
  await expect(mobileIndicator).toBeVisible();
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await expect
    .poll(() => mobileIndicator.evaluate((el) => (el as HTMLProgressElement).value))
    .toBe(100);
});

test('The phone chapter menu stays compact and works on Blog and Product', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const route of documentRoutes) {
    await page.goto(route);
    await expect(page.locator('.reader-sidebar')).toBeHidden();
    const menu = page.locator('.reader-contents');
    await expect(menu).not.toHaveAttribute('open');
    await menu.getByText('On This Page', { exact: true }).click();
    const last = menu.getByRole('link').last();
    const href = await last.getAttribute('href');
    await last.click();
    expect(new URL(page.url()).hash).toBe(href);
    await expect(last).toHaveAttribute('aria-current', 'location');
    const heading = page.locator(`[id=${JSON.stringify(decodeURIComponent(href!.slice(1)))}]`);
    await expect(heading).toBeInViewport();
    expect((await heading.boundingBox())!.y).toBeGreaterThanOrEqual(100);
  }
});

for (const width of [1440, 390]) {
  test(`Product reports and samples render their tables, code and figures at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const samples = [
      {
        slug: 'auto-research',
        tables: 1,
        blocks: 2,
        heading: 'Battleships: Minimum-Cost Radar Search',
        code: 'class Strategy:',
      },
      {
        slug: 'prd-to-repo',
        tables: 2,
        blocks: 4,
        heading: 'Food Delivery Platform API — Product Requirements Document',
        code: 'FROM python:3.12-slim',
      },
      {
        slug: 'enterprise-rl',
        tables: 11,
        blocks: 1,
        heading: 'Result Analysis',
        code: 'harbor_tasks/',
        figures: ['AutomationBench-AA', 'Tau3-Banking-AA'],
      },
    ];
    for (const sample of samples) {
      await page.goto(`/product/${sample.slug}/`);
      await expect(page.getByRole('heading', { name: sample.heading, exact: true })).toHaveCount(1);
      await expect(page.locator('.prose table')).toHaveCount(sample.tables);
      await expect(page.locator('.prose pre')).toHaveCount(sample.blocks);
      if (sample.code) {
        await expect(page.locator('.prose pre').first()).toContainText(sample.code);
      }
      for (const name of sample.figures ?? []) {
        const image = page.getByRole('img', {
          name: `${name} public model scores from Artificial Analysis`,
          exact: true,
        });
        await expect(image).toBeVisible();
        expect(
          await image.evaluate((img) => (img as HTMLImageElement).naturalWidth),
        ).toBeGreaterThan(0);
        await expect(image.locator('..')).toHaveAttribute(
          'href',
          (await image.getAttribute('src'))!,
        );
      }
      expect(
        await page
          .locator('.prose')
          .evaluate((prose) =>
            [...prose.querySelectorAll('p')]
              .filter(
                (p) =>
                  p.children.length === 1 &&
                  p.firstElementChild?.tagName === 'CODE' &&
                  p.textContent === p.firstElementChild.textContent,
              )
              .map((p) => p.textContent),
          ),
      ).toEqual([]);
      const ids = await page
        .locator('.prose [id]')
        .evaluateAll((nodes) => nodes.map((node) => node.id));
      expect(new Set(ids).size).toBe(ids.length);
      for (const block of await page.locator('.prose table, .prose pre').all()) {
        const bounds = await block.boundingBox();
        expect(bounds!.width).toBeLessThanOrEqual(width);
        const overflow = await block.evaluate((node) => node.scrollWidth - node.clientWidth);
        if (overflow > 1) {
          await block.evaluate((node) => {
            node.scrollLeft = node.scrollWidth;
          });
          expect(await block.evaluate((node) => node.scrollLeft)).toBeGreaterThan(0);
        }
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
  });
}

test('Our approved logo forms as particles, followed by the logo and name, with pointer response', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  // Pin shader time so changes come from the particles, not the silver animation.
  await page.addInitScript(() => {
    const state = window as typeof window & { particleTestTime: number };
    state.particleTestTime = 0;
    const locations = new WeakMap<WebGLUniformLocation, { name: string; particles: boolean }>();
    const gl = WebGLRenderingContext.prototype;
    const locate = gl.getUniformLocation;
    gl.getUniformLocation = function (program, name) {
      const location = locate.call(this, program, name);
      if (location)
        locations.set(location, {
          name,
          particles: this.getAttribLocation(program, 'aLogo') !== -1,
        });
      return location;
    };
    const scalar = gl.uniform1f;
    gl.uniform1f = function (location, value) {
      const uniform = location && locations.get(location);
      return scalar.call(
        this,
        location,
        uniform && uniform.name === 'uTime'
          ? uniform.particles
            ? state.particleTestTime
            : 0
          : value,
      );
    };
    const vector = gl.uniform3f;
    gl.uniform3f = function (location, x, y, z) {
      const uniform = location && locations.get(location);
      return vector.call(
        this,
        location,
        x,
        y,
        uniform && uniform.name === 'uPointer' && !uniform.particles ? 0 : z,
      );
    };
  });
  await page.goto('/');
  await expect(page.locator('.data-field')).toHaveAttribute('data-particles', 'ready');
  await expect(page.locator('.brand-symbol')).toHaveAttribute('src', '/brand/bean-labs-symbol.svg');
  expect(await readFile('public/brand/bean-labs-symbol.svg', 'utf8')).toBe(
    await readFile('resource/brand/bean-labs-symbol.svg', 'utf8'),
  );
  const hash = async () =>
    createHash('sha256')
      .update(
        await page.screenshot({
          clip: { x: 270, y: 80, width: 900, height: 350 },
        }),
      )
      .digest('hex');
  const setTime = async (value: number) => {
    await page.evaluate((time) => {
      (window as typeof window & { particleTestTime: number }).particleTestTime = time;
    }, value);
    const frame = Number(await page.locator('.data-field').getAttribute('data-frame'));
    await expect
      .poll(() => page.locator('.data-field').getAttribute('data-frame').then(Number))
      .toBeGreaterThan(frame + 2);
    return hash();
  };
  const staticImage = await hash();
  const logo = await setTime(5);
  expect(logo).not.toBe(staticImage);
  expect(await hash()).toBe(logo);
  const word = await setTime(15);
  expect(word).not.toBe(logo);
  expect(word).not.toBe(staticImage);
  await page.mouse.move(720, 158);
  await expect.poll(hash).not.toBe(word);
  await page.getByRole('button', { name: 'Pause animation', exact: true }).click();
  const paused = await hash();
  await page.mouse.move(600, 180);
  expect(await hash()).toBe(paused);
});

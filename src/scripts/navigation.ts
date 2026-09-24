// A browser transition snapshot would freeze the live background. Keep the
// router's DOM swap and let the persistent veil handle the visual transition.
document.addEventListener('astro:before-swap', (event) => {
  // Skipping intentionally rejects `ready`; consume that expected rejection.
  void event.viewTransition.ready.catch(() => {});
  event.viewTransition.skipTransition();
  const veil = document.querySelector<HTMLElement>('.field-veil');
  const opacity = veil ? getComputedStyle(veil).opacity : '0';
  const swap = event.swap;
  event.swap = () => {
    swap();
    if (!veil) return;
    veil.getAnimations().forEach((animation) => animation.cancel());
    const target = getComputedStyle(veil).opacity;
    if (opacity === target || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // An explicit fade survives reparenting and starts at the current opacity,
    // including when another navigation interrupts an unfinished fade.
    veil.animate([{ opacity }, { opacity: target }], {
      duration: 420,
      easing: 'ease',
    });
  };
});

let pageListeners: AbortController | undefined;
let tocSections: { heading: HTMLElement; links: HTMLAnchorElement[] }[] = [];
let activeSection = '';
let readingIndicators: HTMLProgressElement[] = [];

function updateScroll() {
  document.querySelector('.site-header')?.classList.toggle('scrolled', scrollY > 24);
  const progress = document.querySelector<HTMLElement>('.reading-progress');
  const max = document.documentElement.scrollHeight - innerHeight;
  const fraction = max > 0 ? Math.max(0, Math.min(1, scrollY / max)) : 0;
  if (progress) progress.style.transform = `scaleX(${fraction})`;
  for (const indicator of readingIndicators) {
    indicator.value = fraction * 100;
    indicator.setAttribute('aria-valuetext', `${Math.round(fraction * 100)}%`);
  }
  if (!tocSections.length) return;
  // Anchor headings land at 110px below the fixed header, including short screens.
  // Keep tracking just below the anchor offset. A viewport-relative marker
  // can skip to the next subsection when compact headings sit close together.
  const marker = 120;
  let current = tocSections[0];
  for (const section of tocSections) {
    if (section.heading.getBoundingClientRect().top <= marker) current = section;
    else break;
  }
  if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) {
    current = tocSections[tocSections.length - 1];
  }
  if (activeSection === current.heading.id) return;
  activeSection = current.heading.id;
  for (const section of tocSections) {
    for (const link of section.links) {
      if (section === current) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
  }
  const sidebarLink = current.links.find((link) => link.closest('.reader-sidebar'));
  const sidebar = sidebarLink?.closest<HTMLElement>('.page-toc');
  if (sidebarLink && sidebar?.clientHeight) {
    const item = sidebarLink.getBoundingClientRect();
    const panel = sidebar.getBoundingClientRect();
    // Scroll only the directory when its active item falls outside a short screen.
    if (item.top < panel.top + 12) sidebar.scrollTop += item.top - panel.top - 12;
    else if (item.bottom > panel.bottom - 12) sidebar.scrollTop += item.bottom - panel.bottom + 12;
  }
}

function mountNavigation() {
  pageListeners?.abort();
  pageListeners = new AbortController();
  const { signal } = pageListeners;
  readingIndicators = Array.from(document.querySelectorAll<HTMLProgressElement>('.toc-progress'));
  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('[data-toc] a'));
  tocSections = Array.from(document.querySelectorAll<HTMLElement>('.prose :is(h2, h3)[id]'))
    .map((heading) => ({
      heading,
      links: links.filter((link) => decodeURIComponent(link.hash.slice(1)) === heading.id),
    }))
    .filter((section) => section.links.length > 0);
  activeSection = '';
  const button = document.querySelector<HTMLButtonElement>('.menu-toggle');
  const menu = document.querySelector<HTMLElement>('#mobile-nav');
  const close = () => {
    button?.setAttribute('aria-expanded', 'false');
    button?.setAttribute('aria-label', 'Open navigation');
    if (menu) menu.inert = true;
    document.body.classList.remove('menu-open');
  };
  close();
  button?.addEventListener(
    'click',
    () => {
      const open = button.getAttribute('aria-expanded') !== 'true';
      button.setAttribute('aria-expanded', String(open));
      button.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
      if (menu) menu.inert = !open;
      document.body.classList.toggle('menu-open', open);
    },
    { signal },
  );
  document.addEventListener(
    'keydown',
    (event) => {
      if (!document.body.classList.contains('menu-open')) return;
      if (event.key === 'Escape') {
        close();
        button?.focus();
      }
      if (event.key === 'Tab' && menu && button) {
        const links = Array.from(menu.querySelectorAll<HTMLAnchorElement>('a'));
        const last = links.at(-1);
        if (event.shiftKey && document.activeElement === button && last) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          button.focus();
        }
      }
    },
    { signal },
  );
  menu?.querySelectorAll('a').forEach((link) => link.addEventListener('click', close, { signal }));
  matchMedia('(min-width: 761px)').addEventListener(
    'change',
    (event) => {
      if (event.matches) close();
    },
    { signal },
  );
  updateScroll();
}

addEventListener('scroll', updateScroll, { passive: true });
addEventListener('resize', updateScroll, { passive: true });
document.addEventListener('astro:page-load', mountNavigation);
mountNavigation();

/* Module singleton for the Lenis smooth-scroll instance created in
   App.jsx. Child components (scroll-escape) use scrollPageBy to move
   the whole page when the user is forcibly scrolling past a list.
   Falls back to a native window scroll when Lenis is not mounted. */

let lenisInstance = null;

export function setLenis(instance) {
  lenisInstance = instance;
}

export function scrollPageBy(deltaY) {
  const lenis = lenisInstance;
  if (lenis) {
    const current = typeof lenis.scroll === 'number' ? lenis.scroll : window.scrollY;
    lenis.scrollTo(current + deltaY, { immediate: true, force: true });
  } else {
    window.scrollBy({ top: deltaY, behavior: 'auto' });
  }
}

import { useEffect, useRef, type RefObject } from 'react';

/**
 * Attaches IntersectionObserver to add 'is-visible' class on scroll reveal.
 * Returns a ref to attach to the container element.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(
  threshold = 0.18
): RefObject<T | null> {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold }
    );

    // Observe the element and all .reveal children
    el.querySelectorAll('.reveal').forEach((child) => observer.observe(child));

    return () => observer.disconnect();
  }, [threshold]);

  return ref;
}

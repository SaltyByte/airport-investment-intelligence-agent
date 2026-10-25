import { useLayoutEffect, useRef } from 'react';

/**
 * Scrolls the latest question's article to the top of the scroll area when a question is asked,
 * and on load when a saved conversation is restored. Streaming output never moves the view.
 */
export function useAnchorLatestQuestion(questionCount: number) {
  const scrollRef = useRef<HTMLElement>(null);
  const anchored = useRef<number | null>(null);

  useLayoutEffect(() => {
    const restoring = anchored.current === null;
    if (questionCount > (anchored.current ?? 0)) {
      const smooth =
        !restoring && !matchMedia('(prefers-reduced-motion: reduce)').matches;
      scrollRef.current?.querySelector('article:last-of-type')?.scrollIntoView({
        block: 'start',
        behavior: smooth ? 'smooth' : 'instant',
      });
    }
    anchored.current = questionCount;
  }, [questionCount]);

  return scrollRef;
}

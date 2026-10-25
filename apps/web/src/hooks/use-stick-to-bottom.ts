import { type UIEvent, useLayoutEffect, useRef } from 'react';

export function useStickToBottom(
  messages: unknown,
  status: unknown,
  error: unknown,
) {
  const scrollRef = useRef<HTMLElement>(null);
  const stickToBottom = useRef(true);
  const lastScrollTop = useRef(0);

  // Any upward scroll (wheel, touch, scrollbar drag, track click, keys) away from the bottom
  // detaches auto-follow; returning to the bottom re-attaches it. Content growth never moves
  // scrollTop, so it is not mistaken for the reader scrolling.
  const updateFollow = (el: HTMLElement) => {
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distance < 48) stickToBottom.current = true;
    else if (el.scrollTop < lastScrollTop.current)
      stickToBottom.current = false;
    lastScrollTop.current = el.scrollTop;
  };

  // Follow new output before paint. Re-check direction first: a commit can land before the
  // scroll event of a scroll the reader just made, and must not snap it back.
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-run whenever content changes
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateFollow(el);
    if (stickToBottom.current) {
      el.scrollTop = el.scrollHeight;
      lastScrollTop.current = el.scrollTop;
    }
  }, [messages, status, error]);

  return {
    scrollRef,
    onScroll: (e: UIEvent<HTMLElement>) => updateFollow(e.currentTarget),
    reattach: () => {
      stickToBottom.current = true;
    },
  };
}

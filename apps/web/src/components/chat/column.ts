// One content column for the header, the answer sheets and the composer, so their edges align.
export const column = 'mx-auto w-full max-w-[1040px] px-4 md:px-6';

// The answers scroll inside <main>; the header and composer reserve the same scrollbar gutters
// (on both edges) so their centred column lines up with it.
export const gutters = 'overflow-hidden [scrollbar-gutter:stable_both-edges]';

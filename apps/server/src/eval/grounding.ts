// Thousands-grouped first so "1,234" is one number; "1,2" stays two. Signs, %, ordinals and
// surrounding letters (CY2025, 94th, 15+) are simply not part of the match.
const NUMBER = /\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?/g;

/** Every number in the text by value, in order of appearance. */
export const extractNumbers = (text: string): number[] =>
  (text.match(NUMBER) ?? []).map((n) => Number(n.replaceAll(',', '')));

/** The answer's numbers that no allowed text contains, each once, in order of appearance. */
export const ungroundedNumbers = (answer: string, allowed: string[]) => {
  const known = new Set(allowed.flatMap(extractNumbers));
  return [...new Set(extractNumbers(answer))].filter((n) => !known.has(n));
};

/**
 * The prompt sections the Grounding rule allows numbers from: Readings through Methodology.
 * Throws if a header moved, so a prompt edit cannot silently widen what counts as grounded.
 */
export const groundingPromptText = (instructions: string) => {
  const start = instructions.indexOf('# Readings of places and terms');
  const end = instructions.indexOf('# Grounding');
  if (start === -1) throw new Error('prompt has no "# Readings" section');
  if (end < start)
    throw new Error('prompt has no "# Grounding" section after Readings');
  return instructions.slice(start, end);
};

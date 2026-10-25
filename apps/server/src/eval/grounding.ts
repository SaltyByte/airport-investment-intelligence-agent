const NUMBER = /\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?/g;

export const extractNumbers = (text: string): number[] =>
  (text.match(NUMBER) ?? []).map((n) => Number(n.replaceAll(',', '')));

export const ungroundedNumbers = (answer: string, allowed: string[]) => {
  const known = new Set(allowed.flatMap(extractNumbers));
  return [...new Set(extractNumbers(answer))].filter((n) => !known.has(n));
};

export const groundingPromptText = (instructions: string) => {
  const start = instructions.indexOf('# Readings of places and terms');
  const end = instructions.indexOf('# Grounding');
  if (start === -1) throw new Error('prompt has no "# Readings" section');
  if (end < start)
    throw new Error('prompt has no "# Grounding" section after Readings');
  return instructions.slice(start, end);
};

export function TypingIndicator() {
  return (
    <p className="flex items-center gap-2 text-muted-foreground text-sm">
      <span
        aria-hidden
        className="size-2 animate-pulse rounded-full bg-foreground motion-reduce:animate-none"
      />
      Working on it
    </p>
  );
}

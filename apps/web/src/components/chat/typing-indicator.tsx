const DOT_DELAYS = ['0ms', '150ms', '300ms'];

export function TypingIndicator() {
  return (
    <p className="flex items-center gap-2 text-muted-foreground text-sm">
      <span aria-hidden className="flex items-center gap-1">
        {DOT_DELAYS.map((delay) => (
          <span
            key={delay}
            className="size-1.5 rounded-full bg-primary motion-safe:animate-dot"
            style={{ animationDelay: delay }}
          />
        ))}
      </span>
      Working on it
    </p>
  );
}

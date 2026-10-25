import { Plane } from 'lucide-react';

export function ChatHeader() {
  return (
    <header className="shrink-0 border-b bg-card">
      <div className="mx-auto flex h-14 max-w-[800px] items-center gap-2.5 px-4">
        {/* Location-sign pairing: yellow glyph on the navy field. */}
        <span
          aria-hidden
          className="flex size-7 items-center justify-center rounded-md bg-primary text-highlight"
        >
          <Plane className="size-4" />
        </span>
        <h1 className="font-semibold">Airport Investment Intelligence</h1>
      </div>
    </header>
  );
}

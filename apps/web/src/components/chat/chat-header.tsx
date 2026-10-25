import { cn } from 'cn';
import { ChevronDown, List, Plane, SquarePen } from 'lucide-react';
import { DropdownMenu } from 'radix-ui';
import { column, gutters } from '@/components/chat/column';
import { EXAMPLES } from '@/components/chat/empty-state';
import { Button } from '@/components/ui/button';

// Controls on the ink band: white text, a faint white fill on hover/open, and a white focus ring
// (drafting blue reaches only 2.6:1 on ink).
const onInk =
  'h-11 px-3 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground focus-visible:ring-primary-foreground focus-visible:ring-offset-primary data-[state=open]:bg-primary-foreground/10 motion-safe:active:scale-[0.97]';

export function ChatHeader({
  busy,
  onAsk,
  onNewChat,
}: {
  busy: boolean;
  onAsk: (question: string) => void;
  onNewChat: () => void;
}) {
  return (
    <header
      className={cn('shrink-0 bg-primary text-primary-foreground', gutters)}
    >
      <div className={cn(column, 'flex h-14 items-center gap-2.5')}>
        {/* Location-sign pairing: the yellow glyph on a sign-black field. */}
        <span
          aria-hidden
          className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-sign text-highlight"
        >
          <Plane className="size-4" />
        </span>
        {/* Phone: the glyph alone; the full name stays as the heading's accessible text. */}
        <h1 className="min-w-0 truncate font-semibold max-sm:sr-only">
          Airport Investment Intelligence
        </h1>
        <div className="ms-auto flex items-center gap-1">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <Button variant="ghost" className={onInk}>
                <List aria-hidden />
                Examples
                <ChevronDown aria-hidden className="max-sm:hidden" />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={6}
                collisionPadding={16}
                className="z-50 w-[min(28rem,calc(100vw-2rem))] rounded-lg bg-popover p-1 text-popover-foreground shadow-lg motion-safe:animate-fade-in"
              >
                <DropdownMenu.Label className="px-3 pt-2 pb-1 font-medium text-muted-foreground text-xs">
                  {busy
                    ? 'Available when this answer is done'
                    : 'Example questions'}
                </DropdownMenu.Label>
                {EXAMPLES.map(({ question }) => (
                  <DropdownMenu.Item
                    key={question}
                    disabled={busy}
                    onSelect={() => onAsk(question)}
                    className="flex min-h-11 cursor-default select-none items-center rounded-md px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset data-[disabled]:text-muted-foreground data-[highlighted]:bg-secondary"
                  >
                    {question}
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
          <Button variant="ghost" className={onInk} onClick={onNewChat}>
            <SquarePen aria-hidden />
            New chat
          </Button>
        </div>
      </div>
    </header>
  );
}

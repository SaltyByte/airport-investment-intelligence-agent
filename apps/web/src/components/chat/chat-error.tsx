import { RotateCcw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

// One plain message whatever failed (network, proxy, model): the cause is for the network panel.
export function ChatError({ onRetry }: { onRetry: () => void }) {
  return (
    <Alert variant="destructive" className="bg-card">
      <AlertTitle>The agent didn't answer.</AlertTitle>
      {/* Full foreground: shadcn's destructive/90 text falls just under 4.5:1. */}
      <AlertDescription className="text-foreground!">
        <p>Retry, or ask again in a moment.</p>
        <Button
          variant="outline"
          className="mt-1 h-11 text-foreground motion-safe:active:scale-[0.97]"
          onClick={onRetry}
        >
          <RotateCcw aria-hidden />
          Retry
        </Button>
      </AlertDescription>
    </Alert>
  );
}

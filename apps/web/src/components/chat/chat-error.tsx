import { RotateCcw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

// Network failures (browser) and proxy failures (Vite 5xx with empty body) get one plain message;
// HTTP error bodies (JSON) are never shown raw. Model/stream errors arrive as readable text.
function errorCopy(message: string) {
  if (
    message === '' ||
    message === 'Failed to fetch' ||
    message === 'Failed to fetch the chat response.'
  )
    return 'Could not reach the server. Check that it is running, then retry.';
  if (message.trimStart().startsWith('{'))
    return 'The server could not process this request.';
  return message;
}

export function ChatError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <Alert variant="destructive">
      <AlertTitle>No reply received</AlertTitle>
      {/* Full foreground: shadcn's destructive/90 text falls just under 4.5:1. */}
      <AlertDescription className="text-foreground!">
        <p className="wrap-anywhere">{errorCopy(message)}</p>
        <Button
          variant="outline"
          size="sm"
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

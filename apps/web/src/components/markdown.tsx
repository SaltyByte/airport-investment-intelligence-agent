import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Raw HTML stays disabled (react-markdown default); tables scroll inside their own box.
const components: Components = {
  p: ({ node: _, ...props }) => <p className="leading-relaxed" {...props} />,
  ul: ({ node: _, ...props }) => (
    <ul className="list-disc space-y-1 pl-5" {...props} />
  ),
  ol: ({ node: _, ...props }) => (
    <ol className="list-decimal space-y-1 pl-5" {...props} />
  ),
  h1: ({ node: _, ...props }) => (
    <h3 className="font-semibold text-lg" {...props} />
  ),
  h2: ({ node: _, ...props }) => (
    <h3 className="font-semibold text-base" {...props} />
  ),
  h3: ({ node: _, ...props }) => <h4 className="font-semibold" {...props} />,
  a: ({ node: _, ...props }) => (
    <a
      className="underline underline-offset-4"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    />
  ),
  code: ({ node: _, ...props }) => (
    <code className="rounded bg-muted px-1 py-0.5 text-[0.9em]" {...props} />
  ),
  // Scrollable blocks are labelled regions that take focus so keyboard users can scroll them.
  pre: ({ node: _, ...props }) => (
    <section
      aria-label="Code"
      // biome-ignore lint/a11y/noNoninteractiveTabindex: keyboard-scrollable region
      tabIndex={0}
      className="overflow-x-auto rounded-md bg-muted outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <pre className="p-3" {...props} />
    </section>
  ),
  table: ({ node: _, ...props }) => (
    <section
      aria-label="Table"
      // biome-ignore lint/a11y/noNoninteractiveTabindex: keyboard-scrollable region
      tabIndex={0}
      className="overflow-x-auto rounded-md border outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <table
        className="w-full text-left text-sm [&_tr:last-child_td]:border-b-0"
        {...props}
      />
    </section>
  ),
  th: ({ node: _, ...props }) => (
    <th
      className="border-b px-3 py-1.5 font-medium whitespace-nowrap text-muted-foreground"
      {...props}
    />
  ),
  td: ({ node: _, ...props }) => (
    <td className="border-b px-3 py-1.5 whitespace-nowrap" {...props} />
  ),
};

export function Markdown({ text }: { text: string }) {
  return (
    <div className="flex flex-col gap-3 wrap-anywhere">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  );
}

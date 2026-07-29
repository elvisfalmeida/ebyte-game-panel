import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Safe markdown renderer for remote content (e.g. GitHub release notes). react-markdown
// does NOT render raw HTML (no rehype-raw), so markup can't be injected, and its default
// urlTransform strips dangerous URL protocols. Links open in a new tab. Styling lives in
// the `.gp-markdown` CSS class (theme-agnostic) so it works in light and dark.
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={`gp-markdown ${className ?? ''}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node, ...props }) => {
            void node;
            return <a {...props} target="_blank" rel="noopener noreferrer" />;
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

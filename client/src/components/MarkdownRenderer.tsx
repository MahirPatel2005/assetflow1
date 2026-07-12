import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Props {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = "" }: Props) {
  return (
    <div className={`markdown-body ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }: any) => (
            <h1 className="text-xl font-bold text-slate-900 mt-4 mb-2">{children}</h1>
          ),
          h2: ({ children }: any) => (
            <h2 className="text-lg font-semibold text-slate-800 mt-4 mb-2 border-b border-slate-200 pb-1">{children}</h2>
          ),
          h3: ({ children }: any) => (
            <h3 className="text-base font-semibold text-slate-700 mt-3 mb-1">{children}</h3>
          ),
          p: ({ children }: any) => (
            <p className="text-sm text-slate-700 leading-relaxed mb-2">{children}</p>
          ),
          ul: ({ children }: any) => (
            <ul className="list-disc list-inside text-sm text-slate-700 mb-2 space-y-0.5 pl-2">{children}</ul>
          ),
          ol: ({ children }: any) => (
            <ol className="list-decimal list-inside text-sm text-slate-700 mb-2 space-y-0.5 pl-2">{children}</ol>
          ),
          li: ({ children }: any) => (
            <li className="leading-relaxed">{children}</li>
          ),
          strong: ({ children }: any) => (
            <strong className="font-semibold text-slate-900">{children}</strong>
          ),
          em: ({ children }: any) => (
            <em className="italic text-slate-600">{children}</em>
          ),
          code: ({ inline, children }: any) =>
            inline ? (
              <code className="bg-slate-100 text-indigo-700 rounded px-1 py-0.5 text-xs font-mono">
                {children}
              </code>
            ) : (
              <pre className="bg-slate-900 text-slate-100 rounded-lg p-3 text-xs font-mono overflow-x-auto my-2">
                <code>{children}</code>
              </pre>
            ),
          table: ({ children }: any) => (
            <div className="overflow-x-auto my-3 rounded-lg border border-slate-200">
              <table className="w-full text-xs text-left">{children}</table>
            </div>
          ),
          thead: ({ children }: any) => (
            <thead className="bg-slate-100 text-slate-600 font-semibold uppercase text-xs">{children}</thead>
          ),
          tbody: ({ children }: any) => (
            <tbody className="divide-y divide-slate-100">{children}</tbody>
          ),
          tr: ({ children }: any) => (
            <tr className="hover:bg-slate-50 transition-colors">{children}</tr>
          ),
          th: ({ children }: any) => (
            <th className="px-3 py-2 font-semibold">{children}</th>
          ),
          td: ({ children }: any) => (
            <td className="px-3 py-2 text-slate-700">{children}</td>
          ),
          hr: () => <hr className="my-3 border-slate-200" />,
          blockquote: ({ children }: any) => (
            <blockquote className="border-l-4 border-indigo-300 pl-3 py-1 my-2 text-slate-600 bg-indigo-50 rounded-r">
              {children}
            </blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

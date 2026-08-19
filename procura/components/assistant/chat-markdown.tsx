import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const markdownClass = {
  p: "mb-2 last:mb-0",
  strong: "font-bold",
  em: "italic",
  ul: "mb-2 list-disc space-y-1 pl-5 last:mb-0",
  ol: "mb-2 list-decimal space-y-1 pl-5 last:mb-0",
  li: "leading-6",
  h1: "mb-2 mt-3 text-lg font-bold first:mt-0",
  h2: "mb-2 mt-3 text-base font-bold first:mt-0",
  h3: "mb-1 mt-2 text-sm font-bold first:mt-0",
  blockquote: "mb-2 border-l-2 border-[#006a3f] pl-3 italic",
  code: "rounded bg-white/70 px-1 py-0.5 font-mono text-[0.85em]",
  pre: "mb-2 overflow-x-auto rounded-lg bg-white p-3 text-sm last:mb-0",
  a: "font-semibold underline underline-offset-2",
  hr: "my-3 border-[#d6dfd5]",
};

export function ChatMarkdown({
  content,
  tone = "assistant",
}: {
  content: string;
  tone?: "assistant" | "user";
}) {
  const link = tone === "user" ? "text-white" : "text-[#006a3f]";
  const tableBorder = tone === "user" ? "border-white/30" : "border-[#d6dfd5]";
  const tableHead = tone === "user" ? "bg-white/10" : "bg-white";

  return (
    <div className="max-w-none text-[15px] leading-7">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className={markdownClass.p}>{children}</p>,
          strong: ({ children }) => <strong className={markdownClass.strong}>{children}</strong>,
          em: ({ children }) => <em className={markdownClass.em}>{children}</em>,
          ul: ({ children }) => <ul className={markdownClass.ul}>{children}</ul>,
          ol: ({ children }) => <ol className={markdownClass.ol}>{children}</ol>,
          li: ({ children }) => <li className={markdownClass.li}>{children}</li>,
          h1: ({ children }) => <h1 className={markdownClass.h1}>{children}</h1>,
          h2: ({ children }) => <h2 className={markdownClass.h2}>{children}</h2>,
          h3: ({ children }) => <h3 className={markdownClass.h3}>{children}</h3>,
          blockquote: ({ children }) => (
            <blockquote className={markdownClass.blockquote}>{children}</blockquote>
          ),
          hr: () => <hr className={markdownClass.hr} />,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer" className={`${markdownClass.a} ${link}`}>
              {children}
            </a>
          ),
          code: ({ className, children }) => {
            const isBlock = Boolean(className);
            if (isBlock) {
              return <code className={className}>{children}</code>;
            }
            return <code className={markdownClass.code}>{children}</code>;
          },
          pre: ({ children }) => <pre className={markdownClass.pre}>{children}</pre>,
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto last:mb-0">
              <table className={`min-w-full border-collapse border ${tableBorder} text-left text-sm`}>
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => <thead className={tableHead}>{children}</thead>,
          th: ({ children }) => (
            <th className={`border ${tableBorder} px-3 py-2 font-bold`}>{children}</th>
          ),
          td: ({ children }) => (
            <td className={`border ${tableBorder} px-3 py-2 align-top`}>{children}</td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

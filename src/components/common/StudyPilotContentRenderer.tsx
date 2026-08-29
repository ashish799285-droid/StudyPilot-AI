import React, { Component, ReactNode, useMemo, useState } from "react";
import Markdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import { Check, Copy, AlertCircle } from "lucide-react";

/**
 * Preprocesses raw markdown string to ensure all mathematical, scientific,
 * and chemical LaTeX expressions are cleanly detected by remark-math & rehype-katex.
 */
export function preprocessStudyPilotContent(raw: string): string {
  if (!raw || typeof raw !== "string") return "";

  let processed = raw;

  // 1. Convert standard LaTeX display delimiters \[ ... \] to $$ ... $$
  processed = processed.replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => {
    return `\n\n$$\n${math.trim()}\n$$\n\n`;
  });

  // 2. Convert standard LaTeX inline delimiters \( ... \) to $ ... $
  processed = processed.replace(/\\\(([\s\S]*?)\\\)/g, (_, math) => {
    return `$${math.trim()}$`;
  });

  // 3. Fix instances where display $$ has trailing or leading text on same line without breaks
  processed = processed.replace(/([^\n])\$\$(.+?)\$\$/g, "$1\n\n$$$$2$$\n\n");
  processed = processed.replace(/\$\$(.+?)\$\$([^\n])/g, "\n\n$$$$1$$\n\n$2");

  // 4. Ensure display math blocks on their own lines have clean newlines
  processed = processed.replace(/\n\s*\$\$\s*\n([\s\S]*?)\n\s*\$\$\s*\n/g, (_, math) => {
    return `\n\n$$\n${math.trim()}\n$$\n\n`;
  });

  // 5. Trim whitespace inside inline single dollar delimiters: $ E = mc^2 $ -> $E = mc^2$
  // Look for single $ that are not part of $$ and do not span across newlines
  processed = processed.replace(/(^|[^\\])\$([ \t]+)([^$\n]+?)([ \t]*)\$/g, "$1$$$3$");
  processed = processed.replace(/(^|[^\\])\$([^$\n]+?)([ \t]+)\$/g, "$1$$$2$");

  return processed;
}

/**
 * Fallback Component in case an unexpected parsing error occurs
 */
class MathErrorBoundary extends Component<
  { children: ReactNode; fallbackText?: string },
  { hasError: boolean; errorInfo?: string }
> {
  constructor(props: { children: ReactNode; fallbackText?: string }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, errorInfo: String(error?.message || error) };
  }

  componentDidCatch(error: any, info: any) {
    console.warn("StudyPilotContentRenderer caught rendering error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-xs text-slate-800">
          <div className="flex items-center gap-1.5 font-semibold text-amber-800 mb-1">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>Formatted Academic Content</span>
          </div>
          <div className="whitespace-pre-wrap font-sans leading-relaxed">
            {this.props.fallbackText || "Content rendered with simplified formatting."}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Code block with one-click copy functionality
 */
const CodeBlock: React.FC<{
  inline?: boolean;
  className?: string;
  children?: ReactNode;
}> = ({ inline, className, children, ...props }) => {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || "");
  const lang = match ? match[1] : "";
  const codeString = String(children || "").replace(/\n$/, "");

  if (inline) {
    return (
      <code
        className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.875em] font-semibold text-indigo-700 dark:bg-slate-800 dark:text-indigo-300 border border-slate-200/60 dark:border-slate-700/60"
        {...props}
      >
        {children}
      </code>
    );
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="group relative my-3 overflow-hidden rounded-xl border border-slate-700/50 bg-slate-900 text-slate-100 shadow-md">
      <div className="flex items-center justify-between border-b border-slate-800/80 bg-slate-950/60 px-3.5 py-1.5 text-[11px] font-medium text-slate-400">
        <span className="font-mono uppercase tracking-wider">{lang || "Code"}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] text-slate-300 hover:bg-slate-800 hover:text-white transition"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-3.5 font-mono text-xs leading-relaxed">
        <code className={className} {...props}>
          {children}
        </code>
      </pre>
    </div>
  );
};

export interface StudyPilotContentRendererProps {
  content: string;
  className?: string;
  compact?: boolean;
  inlineOnly?: boolean;
  academicTheme?: "default" | "reader" | "dark" | "transparent";
}

/**
 * Universal StudyPilot Content & Formula Renderer.
 * Handles Markdown, LaTeX math, chemical equations, scientific notation, tables, code blocks, and academic typography.
 */
export const StudyPilotContentRenderer: React.FC<StudyPilotContentRendererProps> = ({
  content,
  className = "",
  compact = false,
  inlineOnly = false,
  academicTheme = "default",
}) => {
  const processedText = useMemo(() => {
    return preprocessStudyPilotContent(content);
  }, [content]);

  // KaTeX options configured for strict academic precision and zero crashing on minor errors
  const rehypeKatexOptions = useMemo(
    () => ({
      throwOnError: false,
      errorColor: "#ef4444",
      output: "htmlAndMathml" as const,
      strict: false,
    }),
    []
  );

  const themeClasses = useMemo(() => {
    switch (academicTheme) {
      case "reader":
        return "text-slate-800 selection:bg-sky-100 selection:text-sky-900";
      case "dark":
        return "text-slate-100 selection:bg-indigo-500 selection:text-white";
      case "transparent":
        return "text-inherit";
      case "default":
      default:
        return "text-slate-800";
    }
  }, [academicTheme]);

  return (
    <MathErrorBoundary fallbackText={content}>
      <div
        className={`studypilot-content-renderer ${compact ? "compact-mode" : ""} ${themeClasses} ${className}`}
      >
        <Markdown
          remarkPlugins={[remarkMath, remarkGfm]}
          rehypePlugins={[[rehypeKatex, rehypeKatexOptions]]}
          components={{
            code: CodeBlock as any,
            // Display math container styling: responsive, centered, subtle academic box styling
            div: ({ node, className: divClass, children, ...props }) => {
              if (divClass && divClass.includes("math-display")) {
                return (
                  <div
                    className="my-3.5 overflow-x-auto rounded-xl border border-sky-100 bg-sky-50/40 p-3.5 text-center shadow-xs backdrop-blur-xs transition-all hover:border-sky-200 hover:bg-sky-50/70 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700"
                    {...props}
                  >
                    <div className="inline-block max-w-full text-slate-900 dark:text-slate-100">
                      {children}
                    </div>
                  </div>
                );
              }
              return (
                <div className={divClass} {...props}>
                  {children}
                </div>
              );
            },
            // Inline math styling: smooth vertical alignment
            span: ({ node, className: spanClass, children, ...props }) => {
              if (spanClass && spanClass.includes("math-inline")) {
                return (
                  <span
                    className="inline-math-container font-serif text-slate-900 dark:text-slate-100 px-0.5"
                    {...props}
                  >
                    {children}
                  </span>
                );
              }
              return (
                <span className={spanClass} {...props}>
                  {children}
                </span>
              );
            },
            // Typography Components
            h1: ({ children }) => (
              <h1 className="mt-4 mb-2 text-xl font-bold tracking-tight text-slate-900 border-b border-slate-200/80 pb-1.5 dark:text-white dark:border-slate-700">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="mt-3.5 mb-1.5 text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="mt-3 mb-1 text-base font-bold text-slate-800 dark:text-slate-200">
                {children}
              </h3>
            ),
            h4: ({ children }) => (
              <h4 className="mt-2 mb-1 text-sm font-semibold text-slate-800 dark:text-slate-200">
                {children}
              </h4>
            ),
            p: ({ children }) => {
              if (inlineOnly) {
                return <span className="leading-relaxed">{children}</span>;
              }
              return (
                <p className={`${compact ? "mb-1.5" : "mb-2.5"} leading-relaxed text-inherit`}>
                  {children}
                </p>
              );
            },
            ul: ({ children }) => (
              <ul className={`${compact ? "my-1" : "my-2"} list-disc pl-5 space-y-1 text-inherit`}>
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol
                className={`${compact ? "my-1" : "my-2"} list-decimal pl-5 space-y-1 text-inherit`}
              >
                {children}
              </ol>
            ),
            li: ({ children }) => (
              <li className="leading-relaxed pl-0.5">{children}</li>
            ),
            blockquote: ({ children }) => (
              <blockquote className="my-2.5 rounded-r-xl border-l-4 border-indigo-500 bg-indigo-50/50 py-1.5 px-3.5 italic text-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                {children}
              </blockquote>
            ),
            strong: ({ children }) => (
              <strong className="font-bold text-slate-900 dark:text-white">{children}</strong>
            ),
            em: ({ children }) => <em className="italic text-inherit">{children}</em>,
            table: ({ children }) => (
              <div className="my-3 overflow-x-auto rounded-xl border border-slate-200/90 shadow-xs dark:border-slate-700">
                <table className="w-full text-left text-xs border-collapse">{children}</table>
              </div>
            ),
            thead: ({ children }) => (
              <thead className="bg-slate-100/90 text-slate-900 dark:bg-slate-800 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 font-semibold">
                {children}
              </thead>
            ),
            th: ({ children }) => <th className="p-2.5 text-xs font-bold">{children}</th>,
            td: ({ children }) => (
              <td className="p-2.5 text-xs border-t border-slate-100 dark:border-slate-800 text-inherit">
                {children}
              </td>
            ),
            hr: () => (
              <hr className="my-3.5 border-0 border-t border-slate-200/80 dark:border-slate-700" />
            ),
            a: ({ href, children }) => (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-indigo-600 underline decoration-indigo-300 underline-offset-2 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                {children}
              </a>
            ),
          }}
        >
          {processedText}
        </Markdown>
      </div>
    </MathErrorBoundary>
  );
};

export default StudyPilotContentRenderer;

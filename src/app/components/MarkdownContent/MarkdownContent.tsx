"use client";

import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import mermaid from "mermaid";
import styles from "./MarkdownContent.module.scss";

interface MarkdownContentProps {
  content: string;
  className?: string;
}

// Simple Mermaid component
const MermaidChart = ({ code }: { code: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [uniqueId] = useState(
    () => `mermaid-${Math.random().toString(36).substr(2, 9)}`
  );

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.innerHTML = "";
      mermaid.render(uniqueId, code).then(({ svg }) => {
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      });
    }
  }, [code, uniqueId]);

  return <div ref={containerRef} className={styles.mermaidChart} />;
};

export const MarkdownContent = React.memo<MarkdownContentProps>(
  ({ content, className = "" }) => {
    useEffect(() => {
      mermaid.initialize({
        startOnLoad: false,
        theme: "dark",
        themeVariables: {
          darkMode: true,
          primaryColor: "#000000",
          primaryTextColor: "#ffffff",
          primaryBorderColor: "#ffffff",
          lineColor: "#ffffff",
          secondaryColor: "#333333",
          tertiaryColor: "#666666",
          background: "#000000",
          surface: "#000000",
          surfaceText: "#ffffff",
        },
      });
    }, []);

    return (
      <div className={`${styles.markdown} ${className}`}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code({ node, inline, className, children, ...props }: any) {
              const match = /language-(\w+)/.exec(className || "");

              if (match && match[1] === "mermaid") {
                return <MermaidChart code={String(children)} />;
              }

              return !inline && match ? (
                <SyntaxHighlighter
                  style={oneDark as any}
                  language={match[1]}
                  PreTag="div"
                  className={styles.codeBlock}
                >
                  {String(children).replace(/\n$/, "")}
                </SyntaxHighlighter>
              ) : (
                <code className={styles.inlineCode} {...props}>
                  {children}
                </code>
              );
            },
            pre({ children }: any) {
              return <div className={styles.preWrapper}>{children}</div>;
            },
            a({ href, children }: any) {
              return (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.link}
                >
                  {children}
                </a>
              );
            },
            blockquote({ children }: any) {
              return (
                <blockquote className={styles.blockquote}>
                  {children}
                </blockquote>
              );
            },
            ul({ children }: any) {
              return <ul className={styles.list}>{children}</ul>;
            },
            ol({ children }: any) {
              return <ol className={styles.orderedList}>{children}</ol>;
            },
            table({ children }: any) {
              return (
                <div className={styles.tableWrapper}>
                  <table className={styles.table}>{children}</table>
                </div>
              );
            },
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  }
);

MarkdownContent.displayName = "MarkdownContent";

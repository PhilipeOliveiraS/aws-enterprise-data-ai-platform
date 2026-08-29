import { Fragment, type ReactNode } from "react";

/**
 * Minimal, dependency-free Markdown renderer for model-generated reports.
 *
 * Deliberately builds React elements instead of HTML strings — there is no
 * `dangerouslySetInnerHTML` anywhere here, so model output cannot inject
 * markup or script into the page. Supported subset: ATX headings (#..###),
 * unordered list items, `**bold**`, and `` `code` ``.
 */

/** Split a line into bold / inline-code / plain runs. */
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(
        <Fragment key={`${keyPrefix}-t${index++}`}>
          {text.slice(lastIndex, match.index)}
        </Fragment>,
      );
    }

    const token = match[0];
    if (token.startsWith("**")) {
      nodes.push(
        <strong
          key={`${keyPrefix}-b${index++}`}
          className="font-semibold text-neutral-100"
        >
          {token.slice(2, -2)}
        </strong>,
      );
    } else {
      nodes.push(
        <code
          key={`${keyPrefix}-c${index++}`}
          className="rounded border border-neutral-700/60 bg-neutral-800/60 px-1 py-0.5 text-[11px] text-neon-cyan-soft"
        >
          {token.slice(1, -1)}
        </code>,
      );
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(
      <Fragment key={`${keyPrefix}-t${index++}`}>
        {text.slice(lastIndex)}
      </Fragment>,
    );
  }

  return nodes;
}

interface MarkdownProps {
  content: string;
}

export function Markdown({ content }: MarkdownProps) {
  const lines = content.split("\n");
  const blocks: ReactNode[] = [];
  let listItems: ReactNode[] = [];

  const flushList = (key: string) => {
    if (listItems.length === 0) return;
    blocks.push(
      <ul key={key} className="my-2 space-y-1.5 pl-1">
        {listItems}
      </ul>,
    );
    listItems = [];
  };

  lines.forEach((rawLine, i) => {
    const line = rawLine.trimEnd();
    const key = `l${i}`;

    if (line.trim().length === 0) {
      flushList(`ul-${key}`);
      return;
    }

    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      flushList(`ul-${key}`);
      const level = heading[1].length;
      const text = heading[2];
      blocks.push(
        <h4
          key={key}
          className={
            level === 1
              ? "mt-4 mb-1.5 text-sm font-bold tracking-tight text-neutral-50 first:mt-0"
              : "mt-4 mb-1.5 text-xs font-bold uppercase tracking-wider text-neon-cyan-soft first:mt-0"
          }
        >
          {renderInline(text, key)}
        </h4>,
      );
      return;
    }

    const bullet = /^\s*[-*+]\s+(.*)$/.exec(line);
    if (bullet) {
      listItems.push(
        <li
          key={key}
          className="flex gap-2 text-xs leading-relaxed text-neutral-300"
        >
          <span aria-hidden="true" className="mt-[2px] text-neutral-600">
            ▪
          </span>
          <span>{renderInline(bullet[1], key)}</span>
        </li>,
      );
      return;
    }

    flushList(`ul-${key}`);
    blocks.push(
      <p key={key} className="my-1.5 text-xs leading-relaxed text-neutral-300">
        {renderInline(line, key)}
      </p>,
    );
  });

  flushList("ul-final");

  return <div>{blocks}</div>;
}

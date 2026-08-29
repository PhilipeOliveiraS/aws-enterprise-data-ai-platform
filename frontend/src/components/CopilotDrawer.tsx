import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import {
  api,
  ApiError,
  type AiStandupResponse,
  type AiTokenUsage,
} from "@/lib/api";
import { Markdown } from "./Markdown";

/**
 * Copilot drawer — the AI surface for TasKiro, backed by Amazon Bedrock.
 *
 * Two modes: a RAG chat grounded in the user's own board, and an on-demand
 * executive standup report. Fully keyboard operable: Escape closes, focus moves
 * into the panel on open and returns to the trigger on close, and Tab cycles
 * within the panel while it is modal.
 */

type Mode = "chat" | "standup";

interface ChatTurn {
  id: string;
  role: "user" | "assistant";
  text: string;
  usage?: AiTokenUsage;
  contextTaskCount?: number;
}

interface CopilotDrawerProps {
  open: boolean;
  onClose: () => void;
  taskCount: number;
}

const SUGGESTIONS = [
  "What should I prioritize today?",
  "Which tasks are at risk of slipping?",
  "Summarize my in-progress work.",
] as const;

/** Selector for the focusable controls inside the panel. */
const FOCUSABLE =
  'button:not([disabled]), textarea:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

export function CopilotDrawer({
  open,
  onClose,
  taskCount,
}: CopilotDrawerProps) {
  const [mode, setMode] = useState<Mode>("chat");
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [standup, setStandup] = useState<AiStandupResponse | null>(null);
  const [standupPending, setStandupPending] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  /* Remember the trigger so focus can be restored when the drawer closes. */
  useEffect(() => {
    if (open) {
      restoreFocusRef.current = document.activeElement as HTMLElement | null;
      // Defer so the panel is mounted and focusable.
      const timer = window.setTimeout(() => inputRef.current?.focus(), 40);
      return () => window.clearTimeout(timer);
    }
    restoreFocusRef.current?.focus?.();
    return undefined;
  }, [open]);

  /* Escape closes the drawer from anywhere inside it. */
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  /* Keep the newest message in view. */
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [turns, pending]);

  /* Trap Tab within the panel while it is open and modal. */
  const handlePanelKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.key !== "Tab" || !panelRef.current) return;

      const nodes = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((node) => node.offsetParent !== null);
      if (nodes.length === 0) return;

      const first = nodes[0];
      const last = nodes[nodes.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [],
  );

  const send = useCallback(
    async (message: string) => {
      const text = message.trim();
      if (text.length === 0 || pending) return;

      const userTurn: ChatTurn = {
        id: crypto.randomUUID(),
        role: "user",
        text,
      };
      setTurns((prev) => [...prev, userTurn]);
      setDraft("");
      setPending(true);
      setError(null);

      try {
        const response = await api.aiChat(text);
        setTurns((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            text: response.answer,
            usage: response.usage,
            contextTaskCount: response.contextTaskCount,
          },
        ]);
      } catch (err) {
        setError(
          err instanceof ApiError
            ? err.message
            : "Copilot is unavailable right now.",
        );
      } finally {
        setPending(false);
        inputRef.current?.focus();
      }
    },
    [pending],
  );

  const loadStandup = useCallback(async () => {
    setStandupPending(true);
    setError(null);
    try {
      setStandup(await api.aiStandup());
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not generate the standup report.",
      );
    } finally {
      setStandupPending(false);
    }
  }, []);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void send(draft);
  };

  const totalTokens = useMemo(
    () => turns.reduce((sum, turn) => sum + (turn.usage?.totalTokens ?? 0), 0),
    [turns],
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      {/* Backdrop. Decorative — Escape and the labelled close button are the
          accessible paths out, so this is hidden from assistive tech. */}
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-black/60 animate-fade-in"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="copilot-title"
        onKeyDown={handlePanelKeyDown}
        className="glass relative flex h-full w-full max-w-md flex-col border-l border-neutral-800/60 animate-pop-in"
      >
        {/* Header */}
        <header className="flex items-start justify-between gap-3 border-b border-neutral-800/60 px-5 py-4">
          <div className="leading-tight">
            <h2
              id="copilot-title"
              className="text-sm font-bold tracking-tight text-neutral-50"
            >
              Tas<span className="text-neon-cyan-soft">Kiro</span> Copilot
            </h2>
            <p className="mt-0.5 text-[11px] text-neutral-500">
              Amazon Bedrock · grounded in {taskCount}{" "}
              {taskCount === 1 ? "task" : "tasks"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Copilot"
            title="Close Copilot (Esc)"
            className="rounded-md border border-neutral-700/60 px-2 py-1 text-xs text-neutral-300 transition hover:border-rose-500/50 hover:text-rose-300"
          >
            ✕
          </button>
        </header>

        {/* Mode tabs */}
        <div
          role="tablist"
          aria-label="Copilot mode"
          className="flex gap-1 border-b border-neutral-800/60 px-4 py-2"
        >
          {(
            [
              { id: "chat", label: "Chat" },
              { id: "standup", label: "Standup" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`copilot-tab-${tab.id}`}
              aria-selected={mode === tab.id}
              aria-controls={`copilot-panel-${tab.id}`}
              onClick={() => setMode(tab.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                mode === tab.id
                  ? "border border-neon-cyan/50 bg-blue-500/10 text-neon-cyan-soft"
                  : "border border-transparent text-neutral-400 hover:text-neutral-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {error && (
          <div
            role="alert"
            className="mx-4 mt-3 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-300"
          >
            {error}
          </div>
        )}

        {/* Chat panel */}
        {mode === "chat" && (
          <div
            role="tabpanel"
            id="copilot-panel-chat"
            aria-labelledby="copilot-tab-chat"
            className="flex min-h-0 flex-1 flex-col"
          >
            <div
              ref={transcriptRef}
              className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
              aria-live="polite"
              aria-busy={pending}
            >
              {turns.length === 0 && (
                <div className="space-y-3">
                  <p className="text-xs leading-relaxed text-neutral-400">
                    Ask about priorities, risks, or progress. Answers are
                    grounded strictly in your own board data.
                  </p>
                  <div className="space-y-1.5">
                    {SUGGESTIONS.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => void send(suggestion)}
                        className="w-full rounded-lg border border-neutral-700/60 bg-neutral-800/30 px-3 py-2 text-left text-xs text-neutral-300 transition hover:border-neon-cyan/40 hover:text-neutral-100"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {turns.map((turn) =>
                turn.role === "user" ? (
                  <div key={turn.id} className="flex justify-end">
                    <p className="max-w-[85%] rounded-xl rounded-br-sm border border-neon-cyan/40 bg-blue-500/10 px-3 py-2 text-xs leading-relaxed text-neutral-100">
                      {turn.text}
                    </p>
                  </div>
                ) : (
                  <div key={turn.id} className="flex flex-col gap-1">
                    <div className="max-w-full rounded-xl rounded-bl-sm border border-neutral-700/60 bg-neutral-800/40 px-3 py-2">
                      <Markdown content={turn.text} />
                    </div>
                    {turn.usage && (
                      <p className="pl-1 font-mono text-[10px] text-neutral-600">
                        {turn.usage.totalTokens} tokens ·{" "}
                        {turn.usage.latencyMs} ms ·{" "}
                        {turn.contextTaskCount ?? 0} tasks in context
                      </p>
                    )}
                  </div>
                ),
              )}

              {pending && (
                <p className="text-xs text-neutral-500">Copilot is thinking…</p>
              )}
            </div>

            <form
              onSubmit={handleSubmit}
              className="border-t border-neutral-800/60 px-4 py-3"
            >
              <label htmlFor="copilot-input" className="sr-only">
                Message to Copilot
              </label>
              <textarea
                id="copilot-input"
                ref={inputRef}
                rows={2}
                value={draft}
                maxLength={2000}
                disabled={pending}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  // Enter sends, Shift+Enter inserts a newline.
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void send(draft);
                  }
                }}
                placeholder="Ask about your board…"
                className="w-full resize-none rounded-lg border border-neutral-700/70 bg-neutral-900/60 px-3 py-2 text-xs text-neutral-100 placeholder:text-neutral-600 transition focus:border-neon-cyan/50 disabled:opacity-50"
              />
              <div className="mt-2 flex items-center justify-between">
                <span className="font-mono text-[10px] text-neutral-600">
                  {totalTokens > 0 ? `${totalTokens} tokens this session` : "Enter to send"}
                </span>
                <button
                  type="submit"
                  disabled={pending || draft.trim().length === 0}
                  className="rounded-lg border border-neon-cyan/50 bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-neon-cyan-soft transition hover:bg-blue-500/20 disabled:opacity-40"
                >
                  {pending ? "Sending…" : "Send"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Standup panel */}
        {mode === "standup" && (
          <div
            role="tabpanel"
            id="copilot-panel-standup"
            aria-labelledby="copilot-tab-standup"
            className="flex min-h-0 flex-1 flex-col"
          >
            <div
              className="flex-1 overflow-y-auto px-4 py-4"
              aria-live="polite"
              aria-busy={standupPending}
            >
              {!standup && !standupPending && (
                <p className="text-xs leading-relaxed text-neutral-400">
                  Generate an executive standup summarizing completed and
                  in-progress work, inferred risks, and today's focus.
                </p>
              )}

              {standupPending && (
                <p className="text-xs text-neutral-500">
                  Aggregating your board…
                </p>
              )}

              {standup && !standupPending && (
                <>
                  <div className="mb-3 flex flex-wrap gap-2">
                    {(
                      [
                        ["To Do", standup.totals.todo],
                        ["In Progress", standup.totals.inProgress],
                        ["Done", standup.totals.done],
                      ] as const
                    ).map(([label, value]) => (
                      <span
                        key={label}
                        className="rounded-md border border-neutral-700/60 bg-neutral-800/40 px-2 py-1 text-[10px] text-neutral-300"
                      >
                        {label}: <strong className="text-neutral-100">{value}</strong>
                      </span>
                    ))}
                  </div>
                  <Markdown content={standup.report} />
                  <p className="mt-4 font-mono text-[10px] text-neutral-600">
                    {standup.usage.totalTokens} tokens ·{" "}
                    {standup.usage.latencyMs} ms ·{" "}
                    {new Date(standup.generatedAt).toLocaleString()}
                  </p>
                </>
              )}
            </div>

            <div className="border-t border-neutral-800/60 px-4 py-3">
              <button
                type="button"
                onClick={() => void loadStandup()}
                disabled={standupPending}
                className="w-full rounded-lg border border-neon-cyan/50 bg-blue-500/10 px-3 py-2 text-xs font-semibold text-neon-cyan-soft transition hover:bg-blue-500/20 disabled:opacity-40"
              >
                {standupPending
                  ? "Generating…"
                  : standup
                    ? "Regenerate report"
                    : "Generate standup"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

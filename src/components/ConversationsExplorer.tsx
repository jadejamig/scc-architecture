"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  apiFetchInit,
  readJsonOrThrow,
  RedirectingToLoginError,
} from "@/lib/client/http";

type ConversationListItem = {
  id: string;
  statusLabel: string;
  firstName: string;
  lastName: string;
  email: string;
  personId: string | null;
};

type MessageItem = {
  id: string;
  body: string;
  logDate: number;
  messageId: string | null;
  role: "customer" | "agent" | "other";
  rawTypeId: string;
};

const PAGE = 10;

/** Fills viewport under header + tabs + main padding; inner lists scroll. */
const CONVO_PANELS_HEIGHT =
  "h-[calc(100svh-14rem)] min-h-[12rem] max-h-[calc(100dvh-14rem)]";

function IconClipboard({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function IconCheck({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function formatListTitle(c: ConversationListItem) {
  const name = [c.firstName, c.lastName].filter(Boolean).join(" ").trim();
  if (name) return name;
  if (c.email) return c.email;
  return c.id.slice(0, 8) + "…";
}

function buildConversationCopyJson(c: ConversationListItem): string {
  const name = [c.firstName, c.lastName].filter(Boolean).join(" ").trim();
  return JSON.stringify(
    {
      conversationId: c.id,
      personId: c.personId,
      name: name || null,
      email: c.email || null,
    },
    null,
    2
  );
}

function formatLogDate(ms: number) {
  if (!ms) return "—";
  try {
    return new Date(ms).toLocaleString();
  } catch {
    return String(ms);
  }
}

export default function ConversationsExplorer() {
  const [q, setQ] = useState("");
  const [applied, setApplied] = useState("");
  const [list, setList] = useState<ConversationListItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [moreLoading, setMoreLoading] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [msgError, setMsgError] = useState<string | null>(null);

  const loadList = useCallback(
    async (opts: {
      reset: boolean;
      after?: string;
      query?: string;
      /** When resetting the first page, keep the selected thread and messages (used by Refresh). */
      keepSelection?: boolean;
    }) => {
      const search = (opts.query !== undefined ? opts.query : applied).trim();
      const keep = opts.keepSelection === true;
      if (opts.reset) {
        setListLoading(true);
        setListError(null);
        setList([]);
        setNextCursor(null);
        setHasMore(false);
        if (!keep) {
          setSelectedId(null);
          setMessages([]);
        }
      } else {
        setMoreLoading(true);
      }
      try {
        const params = new URLSearchParams();
        params.set("limit", String(PAGE));
        if (search) params.set("q", search);
        if (opts.after) params.set("after", opts.after);
        const res = await fetch(`/api/conversations?${params}`, apiFetchInit);
        const data = await readJsonOrThrow<{
          conversations: ConversationListItem[];
          hasMore: boolean;
          nextCursor: string | null;
        }>(res);
        if (opts.reset) {
          setList(data.conversations);
        } else {
          setList((prev) => [...prev, ...data.conversations]);
        }
        setHasMore(data.hasMore);
        setNextCursor(data.nextCursor);
      } catch (e) {
        if (RedirectingToLoginError.is(e)) {
          return;
        }
        setListError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setListLoading(false);
        setMoreLoading(false);
      }
    },
    [applied]
  );

  const initialListDone = useRef(false);
  useEffect(() => {
    if (initialListDone.current) {
      return;
    }
    initialListDone.current = true;
    void loadList({ reset: true, query: "" });
  }, [loadList]);

  const onApplyFilter = () => {
    setApplied(q.trim());
    void loadList({ reset: true, query: q.trim() });
  };

  const onLoadMore = () => {
    if (!nextCursor || moreLoading) return;
    void loadList({ reset: false, after: nextCursor });
  };

  const loadMessages = useCallback(async (conversationId: string) => {
    setSelectedId(conversationId);
    setMsgError(null);
    setMessages([]);
    setMsgLoading(true);
    try {
      const res = await fetch(
        `/api/conversations/${encodeURIComponent(conversationId)}/messages`,
        apiFetchInit
      );
      const data = await readJsonOrThrow<{ messages: MessageItem[]; error?: string }>(
        res
      );
      setMessages(data.messages);
    } catch (e) {
      if (RedirectingToLoginError.is(e)) {
        return;
      }
      setMsgError(e instanceof Error ? e.message : "Failed to load messages");
    } finally {
      setMsgLoading(false);
    }
  }, []);

  const [refreshing, setRefreshing] = useState(false);
  const [copyFeedbackId, setCopyFeedbackId] = useState<string | null>(null);
  const onRefresh = useCallback(() => {
    if (listLoading || refreshing) {
      return;
    }
    setRefreshing(true);
    const sid = selectedId;
    void (async () => {
      try {
        await loadList({ reset: true, query: applied, keepSelection: true });
        if (sid) {
          await loadMessages(sid);
        }
      } finally {
        setRefreshing(false);
      }
    })();
  }, [listLoading, refreshing, loadList, applied, loadMessages, selectedId]);

  const copyConversationJson = useCallback(async (c: ConversationListItem) => {
    try {
      await navigator.clipboard.writeText(buildConversationCopyJson(c));
      setCopyFeedbackId(c.id);
      window.setTimeout(() => {
        setCopyFeedbackId((cur) => (cur === c.id ? null : cur));
      }, 2000);
    } catch {
      // ignore
    }
  }, []);

  return (
    <div
      className={`flex min-h-0 ${CONVO_PANELS_HEIGHT} flex-col gap-4 lg:flex-row lg:items-stretch`}
    >
      <div
        className="flex w-full min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 lg:max-w-88 lg:shrink-0 lg:basis-80"
      >
        <div className="flex shrink-0 items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Conversations
          </h2>
          <button
            type="button"
            onClick={onRefresh}
            disabled={listLoading || refreshing}
            className="shrink-0 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
            title="Reload the list from the server (keeps this tab in memory when you switch away)"
          >
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
        <div className="flex shrink-0 flex-col gap-2">
          <label className="text-xs text-zinc-500" htmlFor="conv-filter">
            Filter by conversation id, name, or email
          </label>
          <div className="flex flex-wrap gap-2">
            <input
              id="conv-filter"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onApplyFilter();
              }}
              placeholder="Search…"
              className="min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
            <button
              type="button"
              onClick={onApplyFilter}
              className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-600"
            >
              Apply
            </button>
          </div>
        </div>

        {listError ? (
          <p className="shrink-0 text-sm text-red-600 dark:text-red-400">{listError}</p>
        ) : null}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {listLoading ? (
            <p className="shrink-0 text-sm text-zinc-500">Loading…</p>
          ) : (
            <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
              {list.map((c) => {
                const active = selectedId === c.id;
                return (
                  <li key={c.id} className="relative w-full list-none">
                    <div
                      className={`relative w-full overflow-hidden rounded-lg border text-left text-sm transition-colors ${
                        active
                          ? "border-sky-500 bg-sky-50 dark:border-sky-500 dark:bg-sky-950/50"
                          : "border-zinc-200 dark:border-zinc-800"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => void loadMessages(c.id)}
                        className="w-full px-3 py-2 pr-9 text-left hover:bg-zinc-50/80 dark:hover:bg-zinc-900/50"
                      >
                        <div className="font-medium text-zinc-900 dark:text-zinc-100">
                          {formatListTitle(c)}
                        </div>
                        <div className="mt-0.5 truncate text-xs text-zinc-500">
                          {c.email || "—"} · {c.id.slice(0, 8)}…
                        </div>
                        <div className="mt-0.5 text-[11px] text-zinc-400">
                          Status: {c.statusLabel}
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void copyConversationJson(c);
                        }}
                        className="absolute right-1 top-1 rounded-md p-1.5 text-zinc-500 hover:bg-zinc-200/80 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                        title="Copy conversationId, personId, name, email as JSON"
                        aria-label="Copy details as JSON"
                      >
                        {copyFeedbackId === c.id ? (
                          <IconCheck className="text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <IconClipboard />
                        )}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {!listLoading && hasMore ? (
          <button
            type="button"
            onClick={onLoadMore}
            disabled={moreLoading}
            className="shrink-0 rounded-lg border border-zinc-200 py-2 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            {moreLoading ? "Loading…" : "Load more"}
          </button>
        ) : null}
      </div>

      <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="shrink-0 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Messages
        </h2>
        <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
          {!selectedId ? (
            <p className="text-sm text-zinc-500">Select a conversation to view messages.</p>
          ) : msgLoading ? (
            <p className="text-sm text-zinc-500">Loading messages…</p>
          ) : msgError ? (
            <p className="text-sm text-red-600 dark:text-red-400">{msgError}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {messages.map((m) => (
                <li
                  key={m.id}
                  className={`max-w-[min(100%,40rem)] rounded-xl px-3 py-2 text-sm ${
                    m.role === "customer"
                      ? "ml-0 self-start bg-sky-100/90 text-sky-950 dark:bg-sky-900/50 dark:text-sky-100"
                      : m.role === "agent"
                        ? "ml-auto self-end bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                        : "self-center bg-amber-50 text-amber-950 dark:bg-amber-950/30 dark:text-amber-100"
                  }`}
                >
                  <div className="mb-1 text-[10px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    {m.role === "customer" ? "Customer" : m.role === "agent" ? "Agent" : "Other"}{" "}
                    · {formatLogDate(m.logDate)}
                  </div>
                  <p className="whitespace-pre-wrap wrap-break-words">{m.body || "—"}</p>
                  {m.messageId ? (
                    <div className="mt-1 text-[10px] text-zinc-400">id: {m.messageId}</div>
                  ) : null}
                </li>
              ))}
              {messages.length === 0 && !msgLoading ? (
                <li className="list-none text-sm text-zinc-500">No messages in this thread.</li>
              ) : null}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

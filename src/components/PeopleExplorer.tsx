"use client";

import { useCallback, useState } from "react";
import {
  apiFetchInit,
  readJsonOrThrow,
  RedirectingToLoginError,
} from "@/lib/client/http";

type PersonListItem = {
  personId: string;
  first_name?: unknown;
  last_name?: unknown;
  email?: unknown;
  phone?: unknown;
};

function formatCell(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "string" || typeof v === "number") return String(v);
  return JSON.stringify(v);
}

export default function PeopleExplorer() {
  const [query, setQuery] = useState("");
  const [people, setPeople] = useState<PersonListItem[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const runSearch = useCallback(async () => {
    const q = query.trim();
    setListError(null);
    setListLoading(true);
    setPeople([]);
    setSelectedId(null);
    setDetail(null);
    try {
      const res = await fetch(
        `/api/people/search?q=${encodeURIComponent(q)}`,
        apiFetchInit
      );
      const data = await readJsonOrThrow<{ people?: PersonListItem[] }>(res);
      setPeople(data.people ?? []);
    } catch (e) {
      if (RedirectingToLoginError.is(e)) {
        return;
      }
      setListError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setListLoading(false);
    }
  }, [query]);

  const loadDetail = useCallback(async (personId: string) => {
    setDetailError(null);
    setDetailLoading(true);
    setDetail(null);
    try {
      const res = await fetch(
        `/api/people/${encodeURIComponent(personId)}`,
        apiFetchInit
      );
      const data = await readJsonOrThrow<Record<string, unknown>>(res);
      setDetail(data);
    } catch (e) {
      if (RedirectingToLoginError.is(e)) {
        return;
      }
      setDetailError(e instanceof Error ? e.message : "Failed to load person");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const onSelectPerson = useCallback(
    (personId: string) => {
      setSelectedId(personId);
      void loadDetail(personId);
    },
    [loadDetail]
  );

  const detailJson = detail
    ? JSON.stringify(detail, null, 2)
    : "";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Search people
        </h2>
        <p className="text-xs text-zinc-500">
          Use a 24-character <code className="text-[11px]">personId</code> (document _id) for an
          exact match, or type part of a first or last name.
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void runSearch();
            }}
            placeholder="personId or name…"
            className="min-w-48 flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <button
            type="button"
            onClick={() => void runSearch()}
            disabled={listLoading || !query.trim()}
            className="rounded-lg border border-zinc-200 bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {listLoading ? "Searching…" : "Search"}
          </button>
        </div>
        {listError ? (
          <p className="text-sm text-red-600 dark:text-red-400">{listError}</p>
        ) : null}
        <div className="max-h-[min(70vh,640px)] overflow-auto rounded-lg border border-zinc-100 dark:border-zinc-800">
          {people.length === 0 && !listLoading && !listError ? (
            <p className="p-4 text-sm text-zinc-500">No results yet. Run a search.</p>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {people.map((p) => {
                const active = selectedId === p.personId;
                return (
                  <li key={p.personId}>
                    <button
                      type="button"
                      onClick={() => onSelectPerson(p.personId)}
                      className={`w-full px-3 py-2.5 text-left text-sm transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900 ${
                        active ? "bg-sky-50 dark:bg-sky-950/40" : ""
                      }`}
                    >
                      <div className="font-medium text-zinc-900 dark:text-zinc-100">
                        {formatCell(p.first_name)} {formatCell(p.last_name)}
                      </div>
                      <div className="mt-0.5 truncate text-xs text-zinc-500">
                        {formatCell(p.email)}
                      </div>
                      <div className="mt-0.5 font-mono text-[11px] text-zinc-400">
                        {p.personId}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="flex max-h-[min(92vh,900px)] flex-col gap-4 overflow-y-auto rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Person details
        </h2>
        {!selectedId ? (
          <p className="text-sm text-zinc-500">Select a person from the list.</p>
        ) : detailLoading ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : detailError ? (
          <p className="text-sm text-red-600 dark:text-red-400">{detailError}</p>
        ) : detail ? (
          <>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
              <dt className="text-zinc-500">personId</dt>
              <dd className="font-mono text-xs text-zinc-800 dark:text-zinc-200">
                {String(detail.personId ?? selectedId)}
              </dd>
              <dt className="text-zinc-500">Name</dt>
              <dd className="text-zinc-900 dark:text-zinc-100">
                {formatCell(detail.first_name)} {formatCell(detail.last_name)}
              </dd>
              <dt className="text-zinc-500">Email</dt>
              <dd className="break-all text-zinc-800 dark:text-zinc-200">
                {formatCell(detail.email)}
              </dd>
              <dt className="text-zinc-500">Phone</dt>
              <dd className="text-zinc-800 dark:text-zinc-200">
                {formatCell(detail.phone)}
              </dd>
              <dt className="text-zinc-500">Transactions</dt>
              <dd className="text-zinc-600 dark:text-zinc-400">
                {Array.isArray(detail.transactions) ? detail.transactions.length : 0}
              </dd>
              <dt className="text-zinc-500">Conversations</dt>
              <dd className="text-zinc-600 dark:text-zinc-400">
                {Array.isArray(detail.conversations) ? detail.conversations.length : 0}
              </dd>
            </dl>
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Full JSON
              </p>
              <pre className="max-h-[min(55vh,560px)] overflow-auto rounded-lg bg-zinc-50 p-3 text-[11px] leading-relaxed text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
                {detailJson}
              </pre>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

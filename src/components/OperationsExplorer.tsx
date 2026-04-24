"use client";

import { useState } from "react";
import { readJsonOrThrow, RedirectingToLoginError } from "@/lib/client/http";

type OpId = "create-conversation";

const OPERATIONS: { id: OpId; title: string; description: string }[] = [
  {
    id: "create-conversation",
    title: "Create conversation",
    description:
      "Closed thread, INCOMING direction, customer conversation_log type. Email finds or creates a person. Optional personId.",
  },
];

type CreateResult = {
  conversationId: string;
  conversationLogId: string;
  personId: string;
  personCreated: boolean;
};

export default function OperationsExplorer() {
  const [active, setActive] = useState<OpId | null>("create-conversation");

  const [email, setEmail] = useState("");
  const [personId, setPersonId] = useState("");
  const [conversationEmail, setConversationEmail] = useState("");
  const [newPersonFirstName, setNewPersonFirstName] = useState("");
  const [newPersonLastName, setNewPersonLastName] = useState("");
  const [message, setMessage] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [subject, setSubject] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateResult | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    const em = email.trim();
    const pid = personId.trim();
    if (!em && !pid) {
      setError("Enter the client’s email or a personId (at least one).");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/operations/create-conversation", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          ...(em ? { email: em } : {}),
          ...(pid ? { personId: pid } : {}),
          ...(conversationEmail.trim()
            ? { conversationEmail: conversationEmail.trim() }
            : {}),
          ...(newPersonFirstName.trim()
            ? { newPersonFirstName: newPersonFirstName.trim() }
            : {}),
          ...(newPersonLastName.trim()
            ? { newPersonLastName: newPersonLastName.trim() }
            : {}),
          orderNumber: orderNumber.trim() || undefined,
          subject: subject.trim() || undefined,
        }),
      });
      const data = await readJsonOrThrow<CreateResult & { error?: string }>(res);
      setResult(data);
    } catch (err) {
      if (RedirectingToLoginError.is(err)) {
        return;
      }
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Operations
        </h2>
        <ul className="space-y-2">
          {OPERATIONS.map((op) => {
            const selected = active === op.id;
            return (
              <li key={op.id}>
                <button
                  type="button"
                  onClick={() => setActive(op.id)}
                  className={`w-full rounded-lg border px-3 py-3 text-left text-sm transition-colors ${
                    selected
                      ? "border-sky-500 bg-sky-50 dark:border-sky-600 dark:bg-sky-950/40"
                      : "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
                  }`}
                >
                  <div className="font-medium text-zinc-900 dark:text-zinc-100">
                    {op.title}
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">{op.description}</p>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        {active === "create-conversation" ? (
          <>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Closed conversation (customer message)
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              <strong>Email:</strong> we look up <code className="text-[11px]">document_data</code> by
              the email attribute (same as Gmail’s{" "}
              <code className="text-[11px]">get_resource_by_email</code>). If there is no row, we
              insert a person the same way as <code className="text-[11px]">create_person</code> in{" "}
              <code className="text-[11px]">app_gmail.js</code> (optional first/last name; otherwise
              derived from the local part of the address).{" "}
              <strong>Person ID</strong> skips lookup and uses that document (it must already exist).
            </p>
            <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3">
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Client email
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="client@example.com"
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                />
              </label>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Person ID (optional)
                <input
                  value={personId}
                  onChange={(e) => setPersonId(e.target.value)}
                  placeholder="If set, email lookup / create is skipped"
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-900"
                />
              </label>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Conversation email override (optional)
                <input
                  type="email"
                  value={conversationEmail}
                  onChange={(e) => setConversationEmail(e.target.value)}
                  placeholder="When using personId: override address on the conversation row"
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                />
              </label>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  New person first name (optional)
                  <input
                    value={newPersonFirstName}
                    onChange={(e) => setNewPersonFirstName(e.target.value)}
                    placeholder="Only if email creates a new person"
                    className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                  />
                </label>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  New person last name (optional)
                  <input
                    value={newPersonLastName}
                    onChange={(e) => setNewPersonLastName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                  />
                </label>
              </div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Message (<code className="text-[11px]">conversation_log.msg</code>)
                <textarea
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  placeholder="<p>Your message…</p>"
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                />
              </label>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Order number (optional)
                <input
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  placeholder="Default subject: Impression Feedback for #…"
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                />
              </label>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Subject override (optional)
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                />
              </label>
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {loading ? "Writing to MongoDB…" : "Send"}
              </button>
            </form>
            {error ? (
              <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
            ) : null}
            {result ? (
              <div className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm dark:bg-emerald-950/30">
                <p className="font-medium text-emerald-900 dark:text-emerald-200">Created</p>
                {result.personCreated ? (
                  <p className="mt-1 text-xs text-emerald-800 dark:text-emerald-300">
                    New person document was created for this email.
                  </p>
                ) : null}
                <pre className="mt-2 overflow-auto text-xs text-emerald-800 dark:text-emerald-300">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-zinc-500">Select an operation.</p>
        )}
      </div>
    </div>
  );
}

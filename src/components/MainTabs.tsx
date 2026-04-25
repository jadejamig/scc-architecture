"use client";

import { useState } from "react";
import AttributeTreeExplorer from "./AttributeTreeExplorer";
import ConversationsExplorer from "./ConversationsExplorer";
import OperationsExplorer from "./OperationsExplorer";
import PeopleExplorer from "./PeopleExplorer";

type TabId = "attributes" | "people" | "operations" | "conversations";

export default function MainTabs() {
  const [tab, setTab] = useState<TabId>("attributes");
  /** After first open, keep mounted (hidden) so list state survives tab switches. */
  const [conversationsMounted, setConversationsMounted] = useState(false);

  return (
    <div>
      <div
        className="flex gap-1 border-b border-zinc-200 px-6 dark:border-zinc-800"
        role="tablist"
        aria-label="Main sections"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "attributes"}
          className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
            tab === "attributes"
              ? "border-sky-600 text-sky-700 dark:border-sky-500 dark:text-sky-400"
              : "border-transparent text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          }`}
          onClick={() => setTab("attributes")}
        >
          Attribute tree
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "people"}
          className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
            tab === "people"
              ? "border-sky-600 text-sky-700 dark:border-sky-500 dark:text-sky-400"
              : "border-transparent text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          }`}
          onClick={() => setTab("people")}
        >
          People
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "operations"}
          className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
            tab === "operations"
              ? "border-sky-600 text-sky-700 dark:border-sky-500 dark:text-sky-400"
              : "border-transparent text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          }`}
          onClick={() => setTab("operations")}
        >
          Operations
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "conversations"}
          className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
            tab === "conversations"
              ? "border-sky-600 text-sky-700 dark:border-sky-500 dark:text-sky-400"
              : "border-transparent text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          }`}
          onClick={() => {
            setConversationsMounted(true);
            setTab("conversations");
          }}
        >
          Conversations
        </button>
      </div>
      <main
        className={`mx-auto px-6 py-8 ${tab === "conversations" ? "max-w-7xl" : "max-w-6xl"}`}
      >
        {tab === "attributes" ? <AttributeTreeExplorer /> : null}
        {tab === "people" ? <PeopleExplorer /> : null}
        {tab === "operations" ? <OperationsExplorer /> : null}
        {conversationsMounted ? (
          <div
            className={tab === "conversations" ? "block" : "hidden"}
            aria-hidden={tab !== "conversations"}
          >
            <ConversationsExplorer />
          </div>
        ) : null}
      </main>
    </div>
  );
}

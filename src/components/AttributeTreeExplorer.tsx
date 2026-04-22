"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  attributeNodeToNestedMap,
  type AttributeTreeNode,
  type NestedAttributeMap,
} from "@/lib/attributes/tree";

type TreePayload = {
  forest: AttributeTreeNode[];
  nested: Record<string, NestedAttributeMap>;
  flat: unknown[];
  cachedAt: string;
};

const EMPTY_FOREST: AttributeTreeNode[] = [];

function filterForest(nodes: AttributeTreeNode[], q: string): AttributeTreeNode[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return nodes;

  function walk(n: AttributeTreeNode): AttributeTreeNode | null {
    const selfMatch = n.attribute.toLowerCase().includes(needle);
    const kids = n.children
      .map(walk)
      .filter((x): x is AttributeTreeNode => x !== null);
    if (selfMatch || kids.length > 0) {
      return { ...n, children: kids };
    }
    return null;
  }

  return nodes.map(walk).filter((x): x is AttributeTreeNode => x !== null);
}

function collectIds(node: AttributeTreeNode, acc: string[] = []): string[] {
  acc.push(node._id);
  for (const c of node.children) collectIds(c, acc);
  return acc;
}

function Row({
  node,
  depth,
  expanded,
  onToggle,
  selectedId,
  onSelect,
}: {
  node: AttributeTreeNode;
  depth: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const hasKids = node.children.length > 0;
  const isOpen = expanded.has(node._id);
  const isSelected = selectedId === node._id;

  return (
    <div className="select-none">
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect(node._id);
            if (hasKids) onToggle(node._id);
          }
        }}
        className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 ${isSelected ? "bg-sky-100 dark:bg-sky-950/50" : ""
          }`}
        style={{ paddingLeft: 8 + depth * 16 }}
        onClick={() => {
          onSelect(node._id);
          if (hasKids) onToggle(node._id);
        }}
      >
        <span className="w-4 text-center text-zinc-500">
          {hasKids ? (isOpen ? "▾" : "▸") : "·"}
        </span>
        <span className="font-medium text-zinc-900 dark:text-zinc-100">{node.attribute}</span>
        {node.dataTypeName ? (
          <span className="truncate text-xs text-zinc-500">({node.dataTypeName})</span>
        ) : null}
      </div>
      {hasKids && isOpen ? (
        <div>
          {node.children.map((c) => (
            <Row
              key={c._id}
              node={c}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function AttributeTreeExplorer() {
  const [payload, setPayload] = useState<TreePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/attributes/tree", { cache: "no-store" });
        const data = (await res.json()) as TreePayload & { error?: string };
        if (!res.ok) {
          throw new Error(data.error ?? res.statusText);
        }
        if (!cancelled) {
          setPayload({
            forest: data.forest,
            nested: data.nested,
            flat: data.flat,
            cachedAt: data.cachedAt,
          });
          setExpanded(new Set(data.forest.map((r) => r._id)));
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const forest = payload?.forest ?? EMPTY_FOREST;

  const filtered = useMemo(() => filterForest(forest, search), [forest, search]);

  const toggle = useCallback((id: string) => {
    setExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }, []);

  const expandAll = useCallback(() => {
    const ids: string[] = [];
    for (const r of filtered) collectIds(r, ids);
    setExpanded(new Set(ids));
  }, [filtered]);

  const collapseAll = useCallback(() => {
    setExpanded(new Set());
  }, []);

  const selectedNode = useMemo(() => {
    if (!selectedId) return null;
    function find(n: AttributeTreeNode): AttributeTreeNode | null {
      if (n._id === selectedId) return n;
      for (const c of n.children) {
        const x = find(c);
        if (x) return x;
      }
      return null;
    }
    for (const r of forest) {
      const x = find(r);
      if (x) return x;
    }
    return null;
  }, [forest, selectedId]);

  const selectedNestedJson = useMemo(() => {
    if (!selectedNode) return null;
    return JSON.stringify(attributeNodeToNestedMap(selectedNode), null, 2);
  }, [selectedNode]);

  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
        Loading attributes…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
        <p className="font-medium">Could not load from MongoDB.</p>
        <p className="mt-2 text-sm">{error}</p>
        <p className="mt-4 text-sm text-red-700/90 dark:text-red-300/90">
          Set <code className="rounded bg-red-100 px-1 dark:bg-red-900/60">MONGODB_URI</code> in{" "}
          <code className="rounded bg-red-100 px-1 dark:bg-red-900/60">.env.local</code> and restart{" "}
          <code className="rounded bg-red-100 px-1 dark:bg-red-900/60">npm run dev</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            placeholder="Filter by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-w-48 flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <button
            type="button"
            onClick={expandAll}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            Expand all
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            Collapse all
          </button>
        </div>
        <p className="text-xs text-zinc-500">
          Cached server payload from{" "}
          <span className="font-mono">{payload?.cachedAt ?? "—"}</span> · {payload?.flat.length ?? 0}{" "}
          documents
        </p>
        <div className="max-h-[min(70vh,640px)] overflow-auto rounded-lg border border-zinc-100 dark:border-zinc-800">
          {filtered.map((r) => (
            <Row
              key={r._id}
              node={r}
              depth={0}
              expanded={expanded}
              onToggle={toggle}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Details & nested map</h2>
        {selectedNode ? (
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            <dt className="text-zinc-500">Name</dt>
            <dd className="font-medium text-zinc-900 dark:text-zinc-100">{selectedNode.attribute}</dd>
            <dt className="text-zinc-500">_id</dt>
            <dd className="font-mono text-xs text-zinc-800 dark:text-zinc-200">{selectedNode._id}</dd>
            <dt className="text-zinc-500">parentId</dt>
            <dd className="font-mono text-xs text-zinc-800 dark:text-zinc-200">
              {selectedNode.parentId ?? "—"}
            </dd>
            <dt className="text-zinc-500">Parent name</dt>
            <dd className="text-zinc-800 dark:text-zinc-200">{selectedNode.parentName ?? "—"}</dd>
            <dt className="text-zinc-500">dataType</dt>
            <dd className="font-mono text-xs text-zinc-800 dark:text-zinc-200">
              {selectedNode.dataType ?? "—"}
            </dd>
            <dt className="text-zinc-500">Data type name</dt>
            <dd className="text-zinc-800 dark:text-zinc-200">{selectedNode.dataTypeName ?? "—"}</dd>
          </dl>
        ) : (
          <p className="text-sm text-zinc-500">Select a row to see metadata.</p>
        )}
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
            Nested object (selected node and descendants)
          </p>
          <pre className="max-h-[min(50vh,480px)] overflow-auto rounded-lg bg-zinc-50 p-3 text-xs leading-relaxed text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
            {selectedNestedJson ?? "Select a row to preview its nested child map."}
          </pre>
        </div>
      </div>
    </div>
  );
}

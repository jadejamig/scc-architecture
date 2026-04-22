import AttributeTreeExplorer from "@/components/AttributeTreeExplorer";

export default function Home() {
  return (
    <div className="min-h-full bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <header className="border-b border-zinc-200 bg-white/80 px-6 py-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
        <h1 className="text-lg font-semibold tracking-tight">Attribute tree (EAV)</h1>
        <p className="mt-1 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          MongoDB <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-900">attribute</code>{" "}
          collection: parent and dataType resolve to other attributes. Hierarchy is cached on the
          server between requests.
        </p>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <AttributeTreeExplorer />
      </main>
    </div>
  );
}

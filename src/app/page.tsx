import MainTabs from "@/components/MainTabs";

export default function Home() {
  return (
    <div className="min-h-full bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <header className="border-b border-zinc-200 bg-white/80 px-6 py-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
        <h1 className="text-lg font-semibold tracking-tight">EAV explorer</h1>
        <p className="mt-1 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Attribute hierarchy and people search backed by MongoDB{" "}
          <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-900">document_data</code>.
        </p>
      </header>
      <MainTabs />
    </div>
  );
}

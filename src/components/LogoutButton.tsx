"use client";

export default function LogoutButton() {
  return (
    <button
      type="button"
      className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-800 shadow-sm hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        window.location.href = "/login";
      }}
    >
      Log out
    </button>
  );
}

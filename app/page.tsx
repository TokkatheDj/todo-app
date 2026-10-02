"use client";

import { useState, useMemo, useSyncExternalStore } from "react";

type Priority = "high" | "medium" | "low";

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
  dueDate?: string; // YYYY-MM-DD
  priority?: Priority;
}

type Filter = "all" | "active" | "completed";

const PRIORITY_ORDER: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

const PRIORITY_STYLES: Record<Priority, { dot: string; badge: string; label: string; name: string }> = {
  high:   { dot: "bg-rose-500",   badge: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",    label: "High", name: "High priority" },
  medium: { dot: "bg-amber-400",  badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300", label: "Med",  name: "Medium priority" },
  low:    { dot: "bg-sky-400",    badge: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",        label: "Low",  name: "Low priority" },
};

// Todos live in localStorage. Reading them through useSyncExternalStore means the
// server render (no localStorage) and the first browser render agree, nothing
// overwrites the saved list on load, and a second open tab stays in sync.
const STORAGE_KEY = "todos";
const listeners = new Set<() => void>();

function readRaw(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "[]";
  } catch {
    return "[]"; // storage blocked (private mode, strict settings)
  }
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange); // edits made in another tab
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function parseTodos(raw: string): Todo[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function useTodos() {
  const raw = useSyncExternalStore(subscribe, readRaw, () => "[]");
  const todos = useMemo(() => parseTodos(raw), [raw]);

  const setTodos = (update: (prev: Todo[]) => Todo[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(update(parseTodos(readRaw()))));
    } catch {}
    listeners.forEach((l) => l());
  };

  const add = (text: string, dueDate?: string, priority?: Priority) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setTodos((prev) => [
      { id: crypto.randomUUID(), text: trimmed, completed: false, createdAt: Date.now(), dueDate, priority },
      ...prev,
    ]);
  };

  const toggle = (id: string) =>
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );

  const remove = (id: string) =>
    setTodos((prev) => prev.filter((t) => t.id !== id));

  const clearCompleted = () =>
    setTodos((prev) => prev.filter((t) => !t.completed));

  const toggleAll = () =>
    setTodos((prev) => {
      const allDone = prev.every((t) => t.completed);
      return prev.map((t) => ({ ...t, completed: !allDone }));
    });

  return { todos, add, toggle, remove, clearCompleted, toggleAll };
}

// The user's own calendar day as YYYY-MM-DD. (toISOString() is UTC, which in
// the evening, e.g. after 8 pm in Detroit, is already tomorrow.)
function localToday() {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${mm}-${dd}`;
}

function DueDate({ date, completed }: { date: string; completed: boolean }) {
  const today = localToday();
  const overdue = !completed && date < today;
  const dueToday = !completed && date === today;
  const formatted = new Date(date + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return (
    <span
      className={`text-xs px-1.5 py-0.5 rounded ml-2 whitespace-nowrap ${
        completed
          ? "text-gray-500 dark:text-gray-400"
          : overdue
          ? "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
          : dueToday
          ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
          : "text-gray-500 dark:text-gray-400"
      }`}
    >
      {overdue ? (
        <>
          <span aria-hidden="true">⚠ </span>
          <span className="sr-only">Overdue: </span>
          {formatted}
        </>
      ) : dueToday ? (
        "Today"
      ) : (
        formatted
      )}
    </span>
  );
}

export default function Home() {
  const { todos, add, toggle, remove, clearCompleted, toggleAll } = useTodos();
  const [input, setInput] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<Priority | "">("");
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = todos
    .filter((t) => {
      if (filter === "active") return !t.completed;
      if (filter === "completed") return t.completed;
      return true;
    })
    .sort((a, b) => {
      // Incomplete before complete, then by priority, then by creation time
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      const pa = a.priority ? PRIORITY_ORDER[a.priority] : 3;
      const pb = b.priority ? PRIORITY_ORDER[b.priority] : 3;
      return pa !== pb ? pa - pb : b.createdAt - a.createdAt;
    });

  const activeCount = todos.filter((t) => !t.completed).length;
  const hasCompleted = todos.some((t) => t.completed);
  const allDone = todos.length > 0 && activeCount === 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    add(input, dueDate || undefined, priority || undefined);
    setInput("");
    setDueDate("");
    setPriority("");
  };

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center pt-16 px-4">
      <h1 className="text-5xl font-thin text-rose-500 dark:text-rose-400 mb-8 tracking-widest uppercase">
        todos
      </h1>

      <div className="w-full max-w-md shadow-lg rounded-lg overflow-hidden">
        {/* Input form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center px-4 pt-3 pb-2">
            {todos.length > 0 && (
              <button
                type="button"
                onClick={toggleAll}
                className="mr-3 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-xl leading-none"
                aria-label={allDone ? "Mark all incomplete" : "Mark all complete"}
              >
                ❯
              </button>
            )}
            <input
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="What needs to be done?"
              aria-label="New todo"
              enterKeyHint="done"
              className="flex-1 min-w-0 bg-transparent outline-none text-gray-700 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 text-lg"
            />
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 pb-3">
            {/* Priority picker */}
            <div className="flex gap-1" role="group" aria-label="Priority">
              {(["high", "medium", "low"] as Priority[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(priority === p ? "" : p)}
                  aria-pressed={priority === p}
                  aria-label={PRIORITY_STYLES[p].name}
                  className={`text-xs px-2 py-0.5 rounded transition-colors ${
                    priority === p
                      ? PRIORITY_STYLES[p].badge + " font-medium"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border border-gray-200 dark:border-gray-600"
                  }`}
                >
                  {PRIORITY_STYLES[p].label}
                </button>
              ))}
            </div>

            <span className="hidden sm:inline text-gray-200 dark:text-gray-700" aria-hidden="true">|</span>

            {/* Due date picker */}
            <div className="flex items-center gap-2">
              <label htmlFor="due-date" className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                Due
              </label>
              <input
                id="due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="text-xs text-gray-600 dark:text-gray-300 bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-rose-300 border border-gray-200 dark:border-gray-600 rounded px-2 py-0.5 cursor-pointer"
              />
              {dueDate && (
                <button
                  type="button"
                  onClick={() => setDueDate("")}
                  aria-label="Clear due date"
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm leading-none"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        </form>

        {/* Todo list */}
        <ul className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
          {filtered.map((todo) => (
            <li key={todo.id} className="flex items-center px-4 py-3 group">
              {/* Priority dot (the badge says it in words) */}
              <div className="w-2 flex-shrink-0 mr-2 flex items-center justify-center" aria-hidden="true">
                {todo.priority && !todo.completed && (
                  <span className={`w-2 h-2 rounded-full ${PRIORITY_STYLES[todo.priority].dot}`} />
                )}
              </div>

              {/* Complete toggle */}
              <button
                onClick={() => toggle(todo.id)}
                className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center mr-3 transition-colors ${
                  todo.completed
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-gray-400 dark:border-gray-500 hover:border-emerald-400"
                }`}
                aria-label={`${todo.completed ? "Mark incomplete" : "Mark complete"}: ${todo.text}`}
              >
                {todo.completed && (
                  <svg className="w-3 h-3" viewBox="0 0 12 10" fill="none" aria-hidden="true">
                    <path
                      d="M1 5l3.5 3.5L11 1"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>

              <span
                className={`flex-1 min-w-0 break-words text-base ${
                  todo.completed
                    ? "line-through text-gray-500 dark:text-gray-400"
                    : "text-gray-700 dark:text-gray-200"
                }`}
              >
                {todo.text}
              </span>

              {todo.priority && (
                <span
                  className={`text-xs px-1.5 py-0.5 rounded ml-2 whitespace-nowrap ${
                    todo.completed
                      ? "text-gray-500 dark:text-gray-400"
                      : PRIORITY_STYLES[todo.priority].badge
                  }`}
                >
                  {PRIORITY_STYLES[todo.priority].label}
                </span>
              )}

              {todo.dueDate && (
                <DueDate date={todo.dueDate} completed={todo.completed} />
              )}

              <button
                onClick={() => remove(todo.id)}
                // Appears on hover with a mouse; always shown on touch screens
                // (they have no hover) and when reached with the keyboard.
                className="text-gray-500 dark:text-gray-400 hover:text-rose-600 dark:hover:text-rose-300 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity text-xl leading-none ml-2 px-1"
                aria-label={`Delete: ${todo.text}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>

        {/* Footer */}
        {todos.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 bg-white dark:bg-gray-800 px-4 py-2 text-sm text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700">
            <span className="whitespace-nowrap" aria-live="polite">
              {activeCount} {activeCount === 1 ? "item" : "items"} left
            </span>

            <div className="flex gap-1" role="group" aria-label="Show">
              {(["all", "active", "completed"] as Filter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  aria-pressed={filter === f}
                  className={`px-2 py-0.5 rounded capitalize transition-colors ${
                    filter === f
                      ? "border border-rose-300 text-rose-600 dark:text-rose-300"
                      : "hover:text-gray-700 dark:hover:text-gray-200"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            <button
              onClick={clearCompleted}
              // invisible, not just transparent, so the keyboard skips it too
              className={`whitespace-nowrap hover:text-gray-700 dark:hover:text-gray-200 ${
                hasCompleted ? "" : "invisible"
              }`}
            >
              Clear completed
            </button>
          </div>
        )}
      </div>

      {todos.length === 0 && (
        <p className="mt-8 text-gray-500 dark:text-gray-400 text-sm">
          No todos yet — add one above!
        </p>
      )}
    </main>
  );
}

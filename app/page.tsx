"use client";

import { useState, useEffect, useRef } from "react";

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
  dueDate?: string; // YYYY-MM-DD
}

type Filter = "all" | "active" | "completed";

function useTodos() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const loaded = useRef(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("todos");
      if (saved) setTodos(JSON.parse(saved));
    } catch {}
    loaded.current = true;
  }, []);

  useEffect(() => {
    if (loaded.current) {
      localStorage.setItem("todos", JSON.stringify(todos));
    }
  }, [todos]);

  const add = (text: string, dueDate?: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setTodos((prev) => [
      { id: crypto.randomUUID(), text: trimmed, completed: false, createdAt: Date.now(), dueDate },
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

  const toggleAll = () => {
    const allDone = todos.every((t) => t.completed);
    setTodos((prev) => prev.map((t) => ({ ...t, completed: !allDone })));
  };

  return { todos, add, toggle, remove, clearCompleted, toggleAll };
}

function DueDate({ date, completed }: { date: string; completed: boolean }) {
  const today = new Date().toISOString().slice(0, 10);
  const overdue = !completed && date < today;
  const dueToday = !completed && date === today;

  return (
    <span
      className={`text-xs px-1.5 py-0.5 rounded ml-2 whitespace-nowrap ${
        completed
          ? "text-gray-300 dark:text-gray-600"
          : overdue
          ? "bg-rose-100 text-rose-500 dark:bg-rose-900/40 dark:text-rose-400"
          : dueToday
          ? "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400"
          : "text-gray-400 dark:text-gray-500"
      }`}
    >
      {overdue ? "⚠ " : dueToday ? "Today" : ""}
      {overdue || dueToday
        ? ""
        : new Date(date + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}
      {overdue
        ? new Date(date + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })
        : ""}
    </span>
  );
}

export default function Home() {
  const { todos, add, toggle, remove, clearCompleted, toggleAll } = useTodos();
  const [input, setInput] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = todos.filter((t) => {
    if (filter === "active") return !t.completed;
    if (filter === "completed") return t.completed;
    return true;
  });

  const activeCount = todos.filter((t) => !t.completed).length;
  const hasCompleted = todos.some((t) => t.completed);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    add(input, dueDate || undefined);
    setInput("");
    setDueDate("");
  };

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center pt-16 px-4">
      <h1 className="text-5xl font-thin text-rose-400 mb-8 tracking-widest uppercase">
        todos
      </h1>

      <div className="w-full max-w-md shadow-lg rounded-lg overflow-hidden">
        {/* Input row */}
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center px-4 pt-3 pb-2">
            {todos.length > 0 && (
              <button
                type="button"
                onClick={toggleAll}
                className="mr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none"
                aria-label="Toggle all"
              >
                ❯
              </button>
            )}
            <input
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="What needs to be done?"
              className="flex-1 bg-transparent outline-none text-gray-700 dark:text-gray-200 placeholder-gray-300 dark:placeholder-gray-500 text-lg"
            />
          </div>
          <div className="flex items-center gap-2 px-4 pb-3">
            <label className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
              Due date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="text-xs text-gray-500 dark:text-gray-400 bg-transparent outline-none border border-gray-200 dark:border-gray-600 rounded px-2 py-0.5 cursor-pointer"
            />
            {dueDate && (
              <button
                type="button"
                onClick={() => setDueDate("")}
                className="text-gray-300 hover:text-gray-500 text-sm leading-none"
              >
                ×
              </button>
            )}
          </div>
        </form>

        {/* Todo list */}
        <ul className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
          {filtered.map((todo) => (
            <li key={todo.id} className="flex items-center px-4 py-3 group">
              <button
                onClick={() => toggle(todo.id)}
                className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center mr-3 transition-colors ${
                  todo.completed
                    ? "border-emerald-400 bg-emerald-400 text-white"
                    : "border-gray-300 dark:border-gray-600 hover:border-emerald-300"
                }`}
                aria-label={todo.completed ? "Mark incomplete" : "Mark complete"}
              >
                {todo.completed && (
                  <svg className="w-3 h-3" viewBox="0 0 12 10" fill="none">
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
                className={`flex-1 text-base ${
                  todo.completed
                    ? "line-through text-gray-300 dark:text-gray-600"
                    : "text-gray-700 dark:text-gray-200"
                }`}
              >
                {todo.text}
              </span>
              {todo.dueDate && (
                <DueDate date={todo.dueDate} completed={todo.completed} />
              )}
              <button
                onClick={() => remove(todo.id)}
                className="text-gray-300 dark:text-gray-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity text-xl leading-none ml-2"
                aria-label="Delete todo"
              >
                ×
              </button>
            </li>
          ))}
        </ul>

        {/* Footer */}
        {todos.length > 0 && (
          <div className="flex items-center justify-between bg-white dark:bg-gray-800 px-4 py-2 text-sm text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-gray-700">
            <span>
              {activeCount} {activeCount === 1 ? "item" : "items"} left
            </span>

            <div className="flex gap-1">
              {(["all", "active", "completed"] as Filter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-2 py-0.5 rounded capitalize transition-colors ${
                    filter === f
                      ? "border border-rose-300 text-rose-400"
                      : "hover:text-gray-600 dark:hover:text-gray-300"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            <button
              onClick={clearCompleted}
              className={`transition-opacity hover:text-gray-600 dark:hover:text-gray-300 ${
                hasCompleted ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}
            >
              Clear completed
            </button>
          </div>
        )}
      </div>

      {todos.length === 0 && (
        <p className="mt-8 text-gray-400 dark:text-gray-600 text-sm">
          No todos yet — add one above!
        </p>
      )}
    </main>
  );
}

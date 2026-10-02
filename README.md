# todos

A small, fast todo list with priorities and due dates. No account and no server: your list stays in your own browser.

**Live:** https://todo-app-gamma-ecru-94.vercel.app

## What it does

- Add a task, and optionally give it a **priority** (High / Med / Low) and a **due date**
- The list sorts itself: unfinished first, then by priority, then newest
- Due dates read at a glance: **Today**, a date, or **⚠ overdue**, always in *your* time zone
- Filter by All / Active / Completed, mark everything done at once, clear finished tasks
- Works on a phone (the delete button is always visible on touch screens), with a keyboard and in dark mode
- Stays in sync if it's open in two tabs

## How it's built

- [Next.js](https://nextjs.org) 16 (App Router) with React 19, TypeScript and Tailwind CSS 4
- One client component (`app/page.tsx`). Todos are saved to `localStorage` and read back through React's `useSyncExternalStore`, so the server-rendered page and the first browser render agree, and a page load never overwrites the saved list
- Prerendered as a static page and deployed on Vercel

## Decisions worth noting

- **"Today" means the user's day, not UTC.** An earlier version used `toISOString()`, so after 8 pm in Detroit a task due today showed as overdue. Dates are now compared on the local calendar.
- **Accessible by default.** Every control has a name a screen reader can say ("Delete: Buy milk"), toggle buttons report whether they're pressed, and the colours pass WCAG AA contrast in both light and dark mode (checked with axe-core).

## Run it locally

```bash
npm install
npm run dev     # http://localhost:3000
npm run lint
npm run build
```

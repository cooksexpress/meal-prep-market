// components/shared/navHistory.ts
//
// Remembers the pages visited on this site during this browser visit,
// so the Back arrow only ever goes back to a Meal Prep Market page and
// never "throws you off" the site (for example after opening a link
// from an email). Stored per tab in sessionStorage.

const KEY = "mpm-nav-stack";

export function readStack(): string[] {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function writeStack(stack: string[]) {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(stack.slice(-50)));
  } catch {
    // Private mode or storage blocked: the Back arrow just uses its fallback.
  }
}

export function recordVisit(path: string) {
  const stack = readStack();
  const last = stack[stack.length - 1];
  if (last === path) return;
  // Going back to the page before: pop instead of push.
  if (stack.length >= 2 && stack[stack.length - 2] === path) {
    stack.pop();
  } else {
    stack.push(path);
  }
  writeStack(stack);
}

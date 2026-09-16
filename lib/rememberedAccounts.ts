// Per-browser convenience only — just enough to show a "continue as" row on
// the login page and hint Google's OAuth flow at which account to try. Real
// auth/authorization always still goes through Supabase + Google.

export interface RememberedAccount {
  email: string;
  name: string;
  avatarUrl: string | null;
}

const KEY = "bewerbify_remembered_accounts";
const MAX_ACCOUNTS = 5;

export function getRememberedAccounts(): RememberedAccount[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function rememberAccount(account: RememberedAccount): void {
  if (typeof window === "undefined" || !account.email) return;
  try {
    const existing = getRememberedAccounts().filter((a) => a.email !== account.email);
    const updated = [account, ...existing].slice(0, MAX_ACCOUNTS);
    localStorage.setItem(KEY, JSON.stringify(updated));
  } catch {
    // Storage unavailable (private mode, quota, etc.) — not critical.
  }
}

export function forgetAccount(email: string): void {
  if (typeof window === "undefined") return;
  try {
    const updated = getRememberedAccounts().filter((a) => a.email !== email);
    localStorage.setItem(KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
}

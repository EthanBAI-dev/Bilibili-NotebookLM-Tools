// NotebookLM Configuration
//
// Google moved the product to notebook.google.com (the "Gemini Notebook"
// rebrand); notebooklm.google.com now 302s there. Requests must target the new
// host directly: following the redirect only carries cookies if the extension
// also holds host permission for where it lands, so an extension that knows
// only the old host ends up making an anonymous request and gets a sign-in
// page back — which reads downstream as "no notebooks" rather than as an auth
// failure. Both hosts stay in host_permissions so the redirect hop itself, and
// any stale tab or bookmark on the old domain, keep working.
export const NOTEBOOKLM_HOSTS = {
  /** Current host — target all API calls and new tabs here. */
  current: 'https://notebook.google.com',
  /** Pre-rebrand host, still redirecting. Recognise it, don't request it. */
  legacy: 'https://notebooklm.google.com',
} as const;

/** Match patterns covering both hosts, for tab queries and content scripts. */
export const NOTEBOOKLM_MATCH_PATTERNS = [
  `${NOTEBOOKLM_HOSTS.current}/*`,
  `${NOTEBOOKLM_HOSTS.legacy}/*`,
] as const;

/** True for a URL on either the current or the legacy host. */
export function isNotebookLmUrl(url: string | undefined): boolean {
  if (!url) return false;
  return url.startsWith(NOTEBOOKLM_HOSTS.current) || url.startsWith(NOTEBOOKLM_HOSTS.legacy);
}

export const NOTEBOOKLM_CONFIG = {
  baseUrl: NOTEBOOKLM_HOSTS.current,
  importDelay: 1500, // Delay between batch imports (ms)
} as const;

// Selected notebook storage key
const SELECTED_NOTEBOOK_KEY = 'selected_notebook';

export interface SelectedNotebook {
  id: string;
  title: string;
  url: string;
}

/** Save user's chosen target notebook for imports */
export async function setSelectedNotebook(notebook: SelectedNotebook): Promise<void> {
  await chrome.storage.local.set({ [SELECTED_NOTEBOOK_KEY]: notebook });
}

/** Get user's chosen target notebook (null if not set) */
export async function getSelectedNotebook(): Promise<SelectedNotebook | null> {
  const result = await chrome.storage.local.get(SELECTED_NOTEBOOK_KEY);
  return result[SELECTED_NOTEBOOK_KEY] ?? null;
}

/**
 * Persist the selected Google account authuser index.
 * This is the key mechanism for multi-account switching:
 * once saved, ALL subsequent NotebookLM API calls will use
 * the corresponding ?authuser=X parameter automatically.
 */
const ACCOUNT_INDEX_KEY = 'selected_account_index';

export async function setSelectedAccountIndex(index: number): Promise<void> {
  await chrome.storage.local.set({ [ACCOUNT_INDEX_KEY]: index });
}

/**
 * Get the persisted selected account authuser index.
 * Returns 0 (primary account) as default.
 */
export async function getSelectedAccountIndex(): Promise<number> {
  const result = await chrome.storage.local.get(ACCOUNT_INDEX_KEY);
  const value = result[ACCOUNT_INDEX_KEY];
  return typeof value === 'number' ? value : 0;
}

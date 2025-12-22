import { supabase } from "@/integrations/supabase/client";

const getProjectId = () => {
  // Prefer env project id if available
  const envId = (import.meta as any).env?.VITE_SUPABASE_PROJECT_ID as string | undefined;
  if (envId) return envId;

  // Fallback: try to parse from supabase URL
  const url = (import.meta as any).env?.VITE_SUPABASE_URL as string | undefined;
  const match = url?.match(/https:\/\/([a-z0-9-]+)\./i);
  return match?.[1];
};

const clearAuthStorage = () => {
  const projectId = getProjectId();
  if (!projectId) return;

  const prefixes = [
    `sb-${projectId}-auth-token`,
    `sb-${projectId}-auth-token-code-verifier`,
  ];

  for (const storage of [window.localStorage, window.sessionStorage]) {
    try {
      const keys = Object.keys(storage);
      for (const key of keys) {
        if (prefixes.some((p) => key === p || key.startsWith(p))) {
          storage.removeItem(key);
        }
      }
    } catch {
      // ignore
    }
  }
};

/**
 * Logout that is resilient to "Session not found" errors.
 * - Always clears browser storage
 * - Always attempts a local sign-out
 * - Optionally attempts server revoke (global) but does not block UX
 */
export const safeSignOut = async () => {
  // 1) Clear storage first so UI can't "auto login" again.
  if (typeof window !== "undefined") clearAuthStorage();

  // 2) Clear local session (should not depend on server state)
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // ignore
  }

  // 3) Best-effort revoke on server (may fail with session_not_found)
  try {
    await supabase.auth.signOut();
  } catch {
    // ignore
  }
};

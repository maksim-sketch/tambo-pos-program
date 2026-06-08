import type { StartSessionResponse } from "../../../../../packages/shared/src";

const CURRENT_POS_SESSION_STORAGE_KEY = "tambo.current-pos-session";

function canUseSessionStorage() {
  return (
    typeof window !== "undefined" &&
    typeof window.sessionStorage !== "undefined"
  );
}

function readStoredValue<T>(storageKey: string, fallback: T): T {
  if (!canUseSessionStorage()) {
    return fallback;
  }

  try {
    const rawValue = window.sessionStorage.getItem(storageKey);
    return rawValue ? (JSON.parse(rawValue) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStoredValue(storageKey: string, value: unknown) {
  if (!canUseSessionStorage()) {
    return;
  }

  window.sessionStorage.setItem(storageKey, JSON.stringify(value));
}

function removeStoredValue(storageKey: string) {
  if (!canUseSessionStorage()) {
    return;
  }

  window.sessionStorage.removeItem(storageKey);
}

function getCurrentPosSession(): StartSessionResponse | null {
  return readStoredValue<StartSessionResponse | null>(
    CURRENT_POS_SESSION_STORAGE_KEY,
    null,
  );
}

export function setCurrentPosSession(session: StartSessionResponse) {
  writeStoredValue(CURRENT_POS_SESSION_STORAGE_KEY, session);
}

export function clearCurrentPosSession() {
  removeStoredValue(CURRENT_POS_SESSION_STORAGE_KEY);
}

export function getCurrentPosSessionToken(): string | null {
  return getCurrentPosSession()?.sessionToken ?? null;
}

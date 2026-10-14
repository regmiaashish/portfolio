import { type MutableRefObject, createContext, useCallback, useContext, useEffect } from "react";

export const LEAVE_MESSAGE = "You have unsaved changes. Leave without saving?";

export const UnsavedContext = createContext<MutableRefObject<boolean> | null>(null);

function useDirtyRef(): MutableRefObject<boolean> {
  const ref = useContext(UnsavedContext);
  if (!ref) throw new Error("Admin hooks must be used inside <AdminApp>");
  return ref;
}

/**
 * Registers a form's dirty state: navigation inside the admin asks for confirmation, and
 * closing or reloading the tab triggers the browser's own warning. Returns `markSaved`,
 * to call right before navigating away after a successful save.
 */
export function useUnsavedChanges(dirty: boolean): () => void {
  const ref = useDirtyRef();

  useEffect(() => {
    ref.current = dirty;
    return () => {
      ref.current = false;
    };
  }, [dirty, ref]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  useBackButtonGuard(dirty, ref);

  return useCallback(() => {
    ref.current = false;
  }, [ref]);
}

const GUARD_FLAG = "__unsavedGuard";

function hasGuardEntry(): boolean {
  const state: unknown = window.history.state;
  return typeof state === "object" && state !== null && GUARD_FLAG in state;
}

function pushGuardEntry(): void {
  // Keep the router's own state (key, idx) so it treats the duplicate as the same location.
  const state: unknown = window.history.state;
  const base = typeof state === "object" && state !== null ? state : {};
  window.history.pushState({ ...base, [GUARD_FLAG]: true }, "", window.location.href);
}

/**
 * The browser Back button can't be cancelled, and react-router's `useBlocker` needs a data
 * router (which this app avoids). So while a form is dirty, the current URL is pushed once
 * more: Back then lands on the same page, and we ask. "Stay" re-arms the guard; "Leave" goes
 * back for real. Caveat: after saving, one duplicate entry for the form can stay in history.
 */
function useBackButtonGuard(dirty: boolean, ref: MutableRefObject<boolean>): void {
  useEffect(() => {
    if (!dirty) return;
    if (!hasGuardEntry()) pushGuardEntry();

    const onPopState = () => {
      if (!ref.current) return;
      if (window.confirm(LEAVE_MESSAGE)) {
        ref.current = false;
        window.history.back();
      } else {
        pushGuardEntry();
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
      // Changes undone while still on the form: drop the duplicate entry again.
      if (!ref.current && hasGuardEntry()) window.history.back();
    };
  }, [dirty, ref]);
}

/** Returns a check to run before leaving the current form: true means "go ahead". */
export function useLeaveGuard(): () => boolean {
  const ref = useDirtyRef();
  return useCallback(() => !ref.current || window.confirm(LEAVE_MESSAGE), [ref]);
}

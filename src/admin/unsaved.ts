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

  return useCallback(() => {
    ref.current = false;
  }, [ref]);
}

/** Returns a check to run before leaving the current form: true means "go ahead". */
export function useLeaveGuard(): () => boolean {
  const ref = useDirtyRef();
  return useCallback(() => !ref.current || window.confirm(LEAVE_MESSAGE), [ref]);
}

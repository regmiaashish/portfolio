import { type ReactNode, useEffect, useRef } from "react";

import { Button } from "../../components/ui/Button";
import styles from "../Admin.module.css";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Native modal <dialog>: traps focus, closes on Escape, and returns focus to the element
 * that opened it. Focus starts on Cancel so a stray Enter never deletes anything.
 */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<Element | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      openerRef.current = document.activeElement;
      dialog.showModal();
      cancelRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
      if (openerRef.current instanceof HTMLElement) openerRef.current.focus();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby="confirm-title"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      <h2 id="confirm-title">{title}</h2>
      <div>{children}</div>
      <div className={styles.dialogActions}>
        <Button ref={cancelRef} onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button variant="primary" onClick={onConfirm} disabled={busy} aria-busy={busy}>
          {busy ? "Deleting…" : confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}

import { type ReactNode, useState } from "react";

import { Button } from "../../components/ui/Button";
import styles from "../Admin.module.css";
import { toSubmitError } from "../serverErrors";
import { ConfirmDialog } from "./ConfirmDialog";
import { GuardedLink } from "./GuardedLink";

export interface OrderedItem {
  id: string;
  title: string;
  meta?: ReactNode;
  editTo: string;
}

interface OrderedListProps {
  label: string;
  noun: string;
  items: OrderedItem[];
  onReorder: (ids: string[]) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

/** Admin list with accessible reordering (Move up / Move down), edit links and deletion. */
export function OrderedList({ label, noun, items, onReorder, onDelete }: OrderedListProps) {
  const [busy, setBusy] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<OrderedItem | null>(null);

  const move = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const ids = items.map((item) => item.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    setBusy(true);
    setError(null);
    try {
      await onReorder(ids);
      setAnnouncement(
        `Moved ${items[index].title} ${direction < 0 ? "up" : "down"} to position ${target + 1}.`,
      );
    } catch (reason) {
      setError(toSubmitError(reason).message);
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setBusy(true);
    setError(null);
    try {
      await onDelete(pendingDelete.id);
      setAnnouncement(`Deleted ${pendingDelete.title}.`);
      setPendingDelete(null);
    } catch (reason) {
      setError(toSubmitError(reason).message);
      setPendingDelete(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <p className="visually-hidden" role="status">
        {announcement}
      </p>
      {error && (
        <p role="alert" className={styles.alert}>
          {error}
        </p>
      )}
      {items.length === 0 ? (
        <p className={styles.muted}>Nothing here yet.</p>
      ) : (
        <ol className={styles.list} aria-label={label}>
          {items.map((item, index) => (
            <li key={item.id} className={styles.row}>
              <div className={styles.rowMain}>
                <p className={styles.rowTitle}>{item.title}</p>
                {item.meta && <div className={styles.rowMeta}>{item.meta}</div>}
              </div>
              <div className={styles.rowActions}>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy || index === 0}
                  aria-label={`Move up ${item.title}`}
                  onClick={() => move(index, -1)}
                >
                  Move up
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy || index === items.length - 1}
                  aria-label={`Move down ${item.title}`}
                  onClick={() => move(index, 1)}
                >
                  Move down
                </Button>
                <GuardedLink
                  to={item.editTo}
                  className={styles.rowLink}
                  aria-label={`Edit ${item.title}`}
                >
                  Edit
                </GuardedLink>
                <Button
                  size="sm"
                  variant="ghost"
                  className={styles.danger}
                  disabled={busy}
                  aria-label={`Delete ${item.title}`}
                  onClick={() => setPendingDelete(item)}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ol>
      )}
      <ConfirmDialog
        open={pendingDelete !== null}
        title={`Delete this ${noun}?`}
        confirmLabel={`Delete ${noun}`}
        busy={busy}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      >
        <p>
          <strong>{pendingDelete?.title}</strong> will be removed from the site. This can't be
          undone.
        </p>
      </ConfirmDialog>
    </>
  );
}

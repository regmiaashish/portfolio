import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";

import { Button, ButtonAnchor } from "../../components/ui/Button";
import { StatusDot } from "../../components/ui/StatusDot";
import { ApiError } from "../../lib/api";
import type { MessageDetail } from "../../lib/cmsContracts";
import styles from "../Admin.module.css";
import { adminApi } from "../api";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { deliveryDisplay, replyHref } from "../messageFormat";
import { absoluteTime } from "../pitchFormat";
import { useMessageStats } from "../unreadMessages";

type State =
  | { status: "loading" }
  | { status: "ready"; message: MessageDetail }
  | { status: "missing" }
  | { status: "error"; error: string };

function errorText(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

/** `/admin/messages/:id`: one contact message, marked read when opened. */
export function MessageDetailPage() {
  const { id = "" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { refresh: refreshStats } = useMessageStats();
  const backTo = `/admin/messages${(location.state as { backTo?: string } | null)?.backTo ?? ""}`;

  const [state, setState] = useState<State>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  const [note, setNote] = useState("");
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState<"read" | "retry" | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // Messages this page already marked read, so it happens once per message (not again after
  // "Mark as unread", and not twice under StrictMode).
  const autoMarked = useRef(new Set<string>());

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });
    adminApi
      .getMessage(id, controller.signal)
      .then((message) => {
        if (controller.signal.aborted) return;
        setState({ status: "ready", message });
        if (message.read || autoMarked.current.has(message.id)) return;
        autoMarked.current.add(message.id);
        adminApi
          .setMessageRead(message.id, true)
          .then((updated) => {
            setState((current) => (current.status === "ready" && current.message.id === updated.id ? { status: "ready", message: updated } : current));
            refreshStats();
          })
          .catch(() => {
            // Stays unread; the admin can still mark it by hand.
          });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        if (error instanceof ApiError && error.status === 404) setState({ status: "missing" });
        else setState({ status: "error", error: errorText(error, "This message couldn't be loaded.") });
      });
    return () => controller.abort();
  }, [id, reloadKey, refreshStats]);

  useEffect(() => {
    if (!note) return;
    const timer = window.setTimeout(() => setNote(""), 3000);
    return () => window.clearTimeout(timer);
  }, [note]);

  const back = (
    <Link to={backTo} className={styles.backLink}>
      Back to messages
    </Link>
  );

  if (state.status === "loading") {
    return (
      <>
        {back}
        <p role="status" className={styles.muted}>
          Loading this message…
        </p>
      </>
    );
  }
  if (state.status === "missing") {
    return (
      <>
        {back}
        <h1>Message not found</h1>
        <p>This message was deleted, or the link is wrong.</p>
      </>
    );
  }
  if (state.status === "error") {
    return (
      <>
        {back}
        <div role="alert" className={styles.alert}>
          <p>{state.error}</p>
          <Button size="sm" onClick={() => setReloadKey((key) => key + 1)}>
            Try again
          </Button>
        </div>
      </>
    );
  }

  const { message } = state;
  const delivery = deliveryDisplay(message.status);

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(message.email);
      setNote("Email address copied.");
    } catch {
      setNote("Copy failed. Select the address and copy it manually.");
    }
  };

  const toggleRead = async () => {
    setBusy("read");
    setActionError("");
    try {
      const updated = await adminApi.setMessageRead(message.id, !message.read);
      setState({ status: "ready", message: updated });
      setNote(updated.read ? "Marked as read." : "Marked as unread.");
      refreshStats();
    } catch (error) {
      setActionError(errorText(error, "The message couldn't be updated."));
    } finally {
      setBusy(null);
    }
  };

  const retry = async () => {
    setBusy("retry");
    setActionError("");
    try {
      const updated = await adminApi.retryMessage(message.id);
      setState({ status: "ready", message: updated });
      setNote("The email is being sent again.");
      refreshStats();
    } catch (error) {
      setActionError(errorText(error, "The email couldn't be retried."));
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    setDeleting(true);
    setActionError("");
    try {
      await adminApi.deleteMessage(message.id);
      refreshStats();
      navigate(backTo, { state: { flash: `Deleted the message from ${message.name}.` } });
    } catch (error) {
      setDeleting(false);
      setConfirming(false);
      setActionError(errorText(error, "The message couldn't be deleted."));
    }
  };

  return (
    <>
      {back}
      <div className={styles.pageHeader}>
        <h1 className={styles.breakAnywhere}>{message.name}</h1>
        <div className={styles.actions}>
          <ButtonAnchor size="sm" variant="primary" href={replyHref(message.email)}>
            Reply
          </ButtonAnchor>
          <Button size="sm" onClick={() => void copyEmail()}>
            Copy email
          </Button>
          <Button size="sm" disabled={busy !== null} aria-busy={busy === "read"} onClick={() => void toggleRead()}>
            {message.read ? "Mark as unread" : "Mark as read"}
          </Button>
          {message.status === "failed" && (
            <Button size="sm" disabled={busy !== null} aria-busy={busy === "retry"} onClick={() => void retry()}>
              {busy === "retry" ? "Retrying…" : "Retry email"}
            </Button>
          )}
          <Button size="sm" className={styles.danger} onClick={() => setConfirming(true)}>
            Delete
          </Button>
        </div>
      </div>
      <p role="status" className={styles.copyNote}>
        {note}
      </p>
      {actionError && (
        <p role="alert" className={styles.alert}>
          {actionError}
        </p>
      )}

      <dl className={styles.detailList}>
        <div>
          <dt>Email</dt>
          <dd>{message.email}</dd>
        </div>
        <div>
          <dt>Received</dt>
          <dd>
            <time dateTime={message.created_at}>{absoluteTime(message.created_at)}</time>
          </dd>
        </div>
        <div>
          <dt>Read</dt>
          <dd>{message.read ? "Read" : "Unread"}</dd>
        </div>
        <div>
          <dt>Notification email</dt>
          <dd>
            <span className={styles.outcome}>
              <StatusDot status={delivery.status} label="" />
              {delivery.label}
            </span>
            {message.status === "failed" && message.error && (
              <span className={styles.outcomeDetail}>{message.error}</span>
            )}
          </dd>
        </div>
      </dl>

      <section aria-labelledby="message-text-heading" className={styles.pitchSection}>
        <h2 id="message-text-heading">Message</h2>
        {/* Plain text only: React escapes it, and pre-wrap keeps the sender's line breaks. */}
        <p className={styles.pitchText}>{message.message}</p>
      </section>

      <ConfirmDialog
        open={confirming}
        title="Delete this message?"
        confirmLabel="Delete message"
        busy={deleting}
        onCancel={() => setConfirming(false)}
        onConfirm={() => void remove()}
      >
        <p>The message from {message.name} will be removed for good. This can't be undone.</p>
      </ConfirmDialog>
    </>
  );
}

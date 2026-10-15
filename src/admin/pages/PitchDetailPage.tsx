import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";

import { Button } from "../../components/ui/Button";
import { StatusDot } from "../../components/ui/StatusDot";
import { ApiError } from "../../lib/api";
import type { PitchRunDetail } from "../../lib/cmsContracts";
import styles from "../Admin.module.css";
import { adminApi } from "../api";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { absoluteTime, formatDuration, formatUsd, outcomeDisplay } from "../pitchFormat";
import { useRequestState } from "../useRequestState";

type State =
  | { status: "loading" }
  | { status: "ready"; run: PitchRunDetail }
  | { status: "missing" }
  | { status: "error"; error: string };

/** `/admin/pitches/:id`: one recorded run with its full pitch text. */
export function PitchDetailPage() {
  const { id = "" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const backTo = `/admin/pitches${(location.state as { backTo?: string } | null)?.backTo ?? ""}`;

  const [reloadKey, setReloadKey] = useState(0);
  const request = `${id}:${reloadKey}`;
  const [state, settle] = useRequestState<State>(request, () => ({ status: "loading" }));
  const [copyNote, setCopyNote] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    adminApi
      .getPitch(id, controller.signal)
      .then((run) => settle(request, { status: "ready", run }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        if (error instanceof ApiError && error.status === 404) settle(request, { status: "missing" });
        else settle(request, { status: "error", error: error instanceof ApiError ? error.message : "This run couldn't be loaded." });
      });
    return () => controller.abort();
  }, [id, request, settle]);

  useEffect(() => {
    if (!copyNote) return;
    const timer = window.setTimeout(() => setCopyNote(""), 2000);
    return () => window.clearTimeout(timer);
  }, [copyNote]);

  const back = (
    <Link to={backTo} className={styles.backLink}>
      Back to pitch history
    </Link>
  );

  if (state.status === "loading") {
    return (
      <>
        {back}
        <p role="status" className={styles.muted}>
          Loading this run…
        </p>
      </>
    );
  }
  if (state.status === "missing") {
    return (
      <>
        {back}
        <h1>Run not found</h1>
        <p>This run was deleted, or the link is wrong.</p>
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

  const { run } = state;
  const shown = outcomeDisplay(run.outcome);
  const tokens =
    run.input_tokens === null && run.output_tokens === null
      ? "Not reported"
      : `${run.input_tokens ?? "?"} in / ${run.output_tokens ?? "?"} out`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(run.pitch_text ?? "");
      setCopyNote("Copied");
    } catch {
      setCopyNote("Copy failed. Select the text and copy it manually.");
    }
  };

  const remove = async () => {
    setDeleting(true);
    setDeleteError("");
    try {
      await adminApi.deletePitch(run.id);
      navigate(backTo, { state: { flash: `Deleted the pitch run for ${run.company}.` } });
    } catch (error) {
      setDeleting(false);
      setConfirming(false);
      setDeleteError(error instanceof ApiError ? error.message : "The run couldn't be deleted.");
    }
  };

  return (
    <>
      {back}
      <div className={styles.pageHeader}>
        <h1>
          {run.company} <span className={styles.muted}>· {run.role}</span>
        </h1>
        <Button variant="secondary" size="sm" className={styles.danger} onClick={() => setConfirming(true)}>
          Delete run
        </Button>
      </div>
      {deleteError && (
        <p role="alert" className={styles.alert}>
          {deleteError}
        </p>
      )}

      <dl className={styles.detailList}>
        <div>
          <dt>Outcome</dt>
          <dd>
            <span className={styles.outcome}>
              <StatusDot status={shown.status} label="" />
              {shown.label}
            </span>
            {shown.detail && <span className={styles.outcomeDetail}>{shown.detail}</span>}
          </dd>
        </div>
        {run.error_code && (
          <div>
            <dt>Error code</dt>
            <dd>
              <code>{run.error_code}</code>
            </dd>
          </div>
        )}
        <div>
          <dt>When</dt>
          <dd>
            <time dateTime={run.created_at}>{absoluteTime(run.created_at)}</time>
          </dd>
        </div>
        <div>
          <dt>Duration</dt>
          <dd>{formatDuration(run.duration_ms)}</dd>
        </div>
        <div>
          <dt>Tokens</dt>
          <dd>{tokens}</dd>
        </div>
        <div>
          <dt>Web searches</dt>
          <dd>{run.searches}</dd>
        </div>
        <div>
          <dt>Estimated cost</dt>
          <dd>{formatUsd(run.estimated_cost_usd)}</dd>
        </div>
      </dl>

      <section aria-labelledby="pitch-text-heading" className={styles.pitchSection}>
        <div className={styles.pageHeader}>
          <h2 id="pitch-text-heading">Pitch</h2>
          {run.pitch_text && (
            <div className={styles.copyRow}>
              <p role="status" className={styles.copyNote}>
                {copyNote}
              </p>
              <Button size="sm" onClick={() => void copy()}>
                Copy pitch
              </Button>
            </div>
          )}
        </div>
        {run.pitch_text ? (
          <p className={styles.pitchText}>{run.pitch_text}</p>
        ) : (
          <p className={styles.muted}>No text was produced for this run.</p>
        )}
      </section>

      <ConfirmDialog
        open={confirming}
        title="Delete this pitch run?"
        confirmLabel="Delete run"
        busy={deleting}
        onCancel={() => setConfirming(false)}
        onConfirm={() => void remove()}
      >
        <p>
          The run for {run.company} ({run.role}) will be removed from the history. This can't be
          undone.
        </p>
      </ConfirmDialog>
    </>
  );
}

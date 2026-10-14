import { useCallback, useEffect, useId, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router";

import fieldStyles from "../../components/ui/Field.module.css";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Field";
import { StatusDot } from "../../components/ui/StatusDot";
import { ApiError } from "../../lib/api";
import type { PitchRunList, PitchStats } from "../../lib/cmsContracts";
import styles from "../Admin.module.css";
import { adminApi } from "../api";
import {
  OUTCOME_FILTERS,
  absoluteTime,
  formatDuration,
  formatUsd,
  isPitchOutcome,
  outcomeDisplay,
  rangeLabel,
  relativeTime,
} from "../pitchFormat";
import { useDebouncedValue } from "../useDebouncedValue";
import { useFlash } from "../useFlash";

export const PITCH_PAGE_SIZE = 20;
export const SEARCH_DEBOUNCE_MS = 300;
const MAX_SEARCH = 80;

type Load<T> =
  | { status: "loading"; data?: T }
  | { status: "ready"; data: T }
  | { status: "error"; error: string; data?: T };

function messageOf(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

/** `/admin/pitches`: usage stats plus every recorded Pitch Me run, newest first. */
export function PitchHistoryPage() {
  const flash = useFlash();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Math.floor(Number(params.get("page"))) || 1);
  const outcomeParam = params.get("outcome");
  const outcome = isPitchOutcome(outcomeParam) ? outcomeParam : undefined;
  const query = params.get("q") ?? "";

  const [search, setSearch] = useState(query);
  const debouncedSearch = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS);
  const [reloadKey, setReloadKey] = useState(0);
  const [list, setList] = useState<Load<PitchRunList>>({ status: "loading" });
  const [stats, setStats] = useState<Load<PitchStats>>({ status: "loading" });
  const captionId = useId();

  const updateParams = useCallback(
    (changes: Record<string, string | undefined>) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          for (const [key, value] of Object.entries(changes)) {
            if (value) next.set(key, value);
            else next.delete(key);
          }
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  // A new search starts again from the first page.
  useEffect(() => {
    if (debouncedSearch !== query) updateParams({ q: debouncedSearch || undefined, page: undefined });
  }, [debouncedSearch, query, updateParams]);

  useEffect(() => {
    const controller = new AbortController();
    setList((current) => ({ status: "loading", data: current.data }));
    adminApi
      .listPitches(
        { limit: PITCH_PAGE_SIZE, offset: (page - 1) * PITCH_PAGE_SIZE, q: query, outcome },
        controller.signal,
      )
      .then((data) => setList({ status: "ready", data }))
      .catch((error: unknown) => {
        if (!isAbort(error)) {
          setList({ status: "error", error: messageOf(error, "The pitch history couldn't be loaded.") });
        }
      });
    return () => controller.abort();
  }, [page, query, outcome, reloadKey]);

  useEffect(() => {
    const controller = new AbortController();
    setStats((current) => ({ status: "loading", data: current.data }));
    adminApi
      .pitchStats(controller.signal)
      .then((data) => setStats({ status: "ready", data }))
      .catch((error: unknown) => {
        if (!isAbort(error)) setStats({ status: "error", error: messageOf(error, "Usage stats couldn't be loaded.") });
      });
    return () => controller.abort();
  }, [reloadKey]);

  const refresh = () => setReloadKey((key) => key + 1);
  const data = list.data;
  const filtered = Boolean(query || outcome);
  const lastPage = data ? Math.max(1, Math.ceil(data.total / PITCH_PAGE_SIZE)) : 1;

  return (
    <>
      <div className={styles.pageHeader}>
        <h1>Pitch history</h1>
        <Button size="sm" onClick={refresh} aria-busy={list.status === "loading"}>
          Refresh
        </Button>
      </div>
      {flash && (
        <p role="status" className={styles.status}>
          {flash}
        </p>
      )}
      <p className={`${styles.muted} ${styles.intro}`}>
        Every Pitch Me run that started, newest first. Only the company, role and generated pitch
        are kept: no visitor IP addresses or other personal data.
      </p>

      <StatsPanel stats={stats} />

      <form role="search" className={styles.filters} onSubmit={(event) => event.preventDefault()}>
        <Input
          label="Search company or role"
          type="search"
          name="q"
          value={search}
          maxLength={MAX_SEARCH}
          onChange={(event) => setSearch(event.target.value)}
        />
        <div className={fieldStyles.field}>
          <label className={fieldStyles.label} htmlFor="pitch-outcome">
            Outcome
          </label>
          <select
            id="pitch-outcome"
            className={fieldStyles.control}
            value={outcome ?? ""}
            onChange={(event) => updateParams({ outcome: event.target.value || undefined, page: undefined })}
          >
            <option value="">All outcomes</option>
            {OUTCOME_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </form>

      {list.status === "error" && (
        <div role="alert" className={styles.alert}>
          <p>{list.error}</p>
          <Button size="sm" onClick={refresh}>
            Try again
          </Button>
        </div>
      )}
      {list.status === "loading" && !data && (
        <p role="status" className={styles.muted}>
          Loading pitch history…
        </p>
      )}

      {data && data.items.length === 0 && list.status !== "error" && (
        <p className={styles.empty}>
          {filtered ? "No pitches match your search." : "No pitches yet. Runs appear here once visitors use Pitch Me."}
        </p>
      )}

      {data && data.items.length > 0 && (
        // Wide table on small screens: it scrolls inside this labelled region instead of
        // widening the page. Focusable so keyboard users can scroll it (WCAG 2.1.1).
        <div
          className={styles.tableScroll}
          role="region"
          aria-labelledby={captionId}
          aria-busy={list.status === "loading"}
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
          tabIndex={0}
        >
          <table className={styles.table}>
            <caption id={captionId} className="visually-hidden">
              Pitch runs, newest first
            </caption>
            <thead>
              <tr>
                <th scope="col">When</th>
                <th scope="col">Company</th>
                <th scope="col">Role</th>
                <th scope="col">Outcome</th>
                <th scope="col">Duration</th>
                <th scope="col">Cost</th>
                <th scope="col">Preview</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((run) => {
                const shown = outcomeDisplay(run.outcome);
                return (
                  <tr key={run.id}>
                    <td className={styles.nowrap}>
                      <time dateTime={run.created_at} title={absoluteTime(run.created_at)}>
                        {relativeTime(run.created_at)}
                      </time>
                    </td>
                    <th scope="row">
                      <Link
                        to={`/admin/pitches/${run.id}`}
                        state={{ backTo: location.search }}
                        aria-label={`${run.company}, ${run.role}: view run`}
                      >
                        {run.company}
                      </Link>
                    </th>
                    <td>{run.role}</td>
                    <td className={styles.nowrap}>
                      <span className={styles.outcome} title={shown.detail}>
                        <StatusDot status={shown.status} label="" />
                        {shown.label}
                      </span>
                    </td>
                    <td className={styles.nowrap}>{formatDuration(run.duration_ms)}</td>
                    <td className={styles.nowrap}>{formatUsd(run.estimated_cost_usd)}</td>
                    <td className={styles.previewCell}>
                      {run.preview ? (
                        <span className={styles.previewText}>{run.preview}</span>
                      ) : (
                        <span className={styles.muted}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {data && data.total > 0 && (
        <nav aria-label="Pitch history pages" className={styles.pager}>
          <Button size="sm" disabled={page <= 1} onClick={() => updateParams({ page: page - 1 > 1 ? String(page - 1) : undefined })}>
            Previous
          </Button>
          <p aria-live="polite">{rangeLabel(data.offset, data.items.length, data.total)}</p>
          <Button size="sm" disabled={page >= lastPage} onClick={() => updateParams({ page: String(page + 1) })}>
            Next
          </Button>
        </nav>
      )}
    </>
  );
}

function StatsPanel({ stats }: { stats: Load<PitchStats> }) {
  if (stats.status === "error") {
    return (
      <p role="alert" className={styles.alert}>
        {stats.error}
      </p>
    );
  }
  const data = stats.data;
  if (!data) {
    return (
      <p role="status" className={styles.muted}>
        Loading usage…
      </p>
    );
  }
  const cap = Math.max(data.daily_cap, 0);
  return (
    <section aria-labelledby="pitch-usage-heading" className={styles.stats}>
      <h2 id="pitch-usage-heading" className="visually-hidden">
        Usage
      </h2>
      <div className={styles.statCard}>
        <p className={styles.statTitle}>Pitch Me</p>
        <p className={styles.outcome}>
          <StatusDot status={data.enabled ? "done" : "idle"} label="" />
          {data.enabled ? "Pitch Me is on" : "Pitch Me is off"}
        </p>
      </div>
      <div className={styles.statCard}>
        <p className={styles.statTitle} id="pitch-today-label">
          Today (UTC)
        </p>
        <p>
          {data.today.paid_runs} of {cap} paid runs today
        </p>
        <meter
          className={styles.meter}
          aria-labelledby="pitch-today-label"
          min={0}
          max={Math.max(cap, 1)}
          value={Math.min(data.today.paid_runs, Math.max(cap, 1))}
          low={Math.max(cap, 1) * 0.7}
          high={Math.max(cap, 1) * 0.9}
          optimum={0}
        >
          {data.today.paid_runs} of {cap}
        </meter>
        <dl className={styles.statList}>
          <div>
            <dt>Cached</dt>
            <dd>{data.today.cached}</dd>
          </div>
          <div>
            <dt>Failed</dt>
            <dd>{data.today.failed}</dd>
          </div>
        </dl>
      </div>
      <div className={styles.statCard}>
        <p className={styles.statTitle}>Last 30 days</p>
        <dl className={styles.statList}>
          <div>
            <dt>Runs</dt>
            <dd>{data.last_30_days.runs}</dd>
          </div>
          <div>
            <dt>Cached</dt>
            <dd>{data.last_30_days.cached}</dd>
          </div>
          <div>
            <dt>Failed</dt>
            <dd>{data.last_30_days.failed}</dd>
          </div>
          <div>
            <dt>Estimated spend</dt>
            <dd>{formatUsd(data.last_30_days.estimated_cost_usd)}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}

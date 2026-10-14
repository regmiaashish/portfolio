import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router";

import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Field";
import { StatusDot } from "../../components/ui/StatusDot";
import { ApiError } from "../../lib/api";
import type { MessageList } from "../../lib/cmsContracts";
import styles from "../Admin.module.css";
import { adminApi } from "../api";
import { MESSAGE_FILTERS, deliveryDisplay, isMessageFilter } from "../messageFormat";
import { absoluteTime, rangeLabel, relativeTime } from "../pitchFormat";
import { useMessageStats } from "../unreadMessages";
import { useDebouncedValue } from "../useDebouncedValue";
import { useFlash } from "../useFlash";
import { SEARCH_DEBOUNCE_MS } from "./PitchHistoryPage";

export const MESSAGE_PAGE_SIZE = 20;
const MAX_SEARCH = 100;

type Load<T> =
  | { status: "loading"; data?: T }
  | { status: "ready"; data: T }
  | { status: "error"; error: string; data?: T };

/** `/admin/messages`: contact-form submissions, newest first. */
export function MessagesPage() {
  const flash = useFlash();
  const location = useLocation();
  const { stats, refresh: refreshStats } = useMessageStats();
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Math.floor(Number(params.get("page"))) || 1);
  const filterParam = params.get("filter");
  const filter = isMessageFilter(filterParam) ? filterParam : undefined;
  const query = params.get("q") ?? "";

  const [search, setSearch] = useState(query);
  const debouncedSearch = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS);
  const [reloadKey, setReloadKey] = useState(0);
  const [list, setList] = useState<Load<MessageList>>({ status: "loading" });

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
      .listMessages(
        {
          limit: MESSAGE_PAGE_SIZE,
          offset: (page - 1) * MESSAGE_PAGE_SIZE,
          q: query,
          status: filter === "failed" ? "failed" : undefined,
          unread: filter === "unread",
        },
        controller.signal,
      )
      .then((data) => setList({ status: "ready", data }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setList({
          status: "error",
          error: error instanceof ApiError ? error.message : "The messages couldn't be loaded.",
        });
      });
    return () => controller.abort();
  }, [page, query, filter, reloadKey]);

  const refresh = () => {
    setReloadKey((key) => key + 1);
    refreshStats();
  };
  const data = list.data;
  const filtered = Boolean(query || filter);
  const lastPage = data ? Math.max(1, Math.ceil(data.total / MESSAGE_PAGE_SIZE)) : 1;

  return (
    <>
      <div className={styles.pageHeader}>
        <h1>Messages</h1>
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
        Everything sent through the contact form, newest first. Only the name, email and message
        are kept: no IP addresses or other visitor data.
        {stats && (
          <>
            {" "}
            {stats.total} in total · {stats.unread} unread · {stats.failed} with a failed email ·{" "}
            {stats.last_7_days} in the last 7 days.
          </>
        )}
      </p>

      <form role="search" className={styles.filters} onSubmit={(event) => event.preventDefault()}>
        <Input
          label="Search name, email or message"
          type="search"
          name="q"
          value={search}
          maxLength={MAX_SEARCH}
          onChange={(event) => setSearch(event.target.value)}
        />
        <div role="group" aria-label="Show" className={styles.segmented}>
          {MESSAGE_FILTERS.map((option) => (
            <Button
              key={option.label}
              size="sm"
              variant={filter === option.value ? "primary" : "secondary"}
              aria-pressed={filter === option.value}
              onClick={() => updateParams({ filter: option.value, page: undefined })}
            >
              {option.label}
            </Button>
          ))}
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
          Loading messages…
        </p>
      )}

      {data && data.items.length === 0 && list.status !== "error" && (
        <p className={styles.empty}>
          {filtered
            ? "No messages match this view."
            : "No messages yet. Contact-form submissions appear here."}
        </p>
      )}

      {data && data.items.length > 0 && (
        <ul className={styles.list} aria-label="Messages, newest first" aria-busy={list.status === "loading"}>
          {data.items.map((message) => {
            const delivery = deliveryDisplay(message.status);
            return (
              <li
                key={message.id}
                className={`${styles.row} ${message.read ? "" : styles.rowUnread}`}
                data-unread={message.read ? undefined : "true"}
              >
                <div className={styles.rowMain}>
                  <p className={styles.rowTitle}>
                    {!message.read && <span className={styles.unreadTag}>Unread</span>}
                    <Link
                      to={`/admin/messages/${message.id}`}
                      state={{ backTo: location.search }}
                      aria-label={`${message.read ? "Message" : "Unread message"} from ${message.name}`}
                    >
                      {message.name}
                    </Link>
                  </p>
                  <p className={styles.rowMeta}>
                    <span className={styles.breakAnywhere}>{message.email}</span>
                    <time dateTime={message.created_at} title={absoluteTime(message.created_at)}>
                      {relativeTime(message.created_at)}
                      <span className="visually-hidden"> ({absoluteTime(message.created_at)})</span>
                    </time>
                    <span className={styles.outcome}>
                      <StatusDot status={delivery.status} label="" />
                      {delivery.label}
                    </span>
                  </p>
                  <p className={styles.previewText}>{message.preview}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {data && data.total > 0 && (
        <nav aria-label="Message pages" className={styles.pager}>
          <Button
            size="sm"
            disabled={page <= 1}
            onClick={() => updateParams({ page: page - 1 > 1 ? String(page - 1) : undefined })}
          >
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

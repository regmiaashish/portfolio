import { Button } from "../../components/ui/Button";
import { useAdminContent } from "../adminContent";
import styles from "../Admin.module.css";

/** Loading / error placeholder for admin pages while `GET /admin/content` is pending. */
export function LoadState() {
  const { status, error, reload } = useAdminContent();
  if (status === "loading") {
    return (
      <p role="status" className={styles.muted}>
        Loading content…
      </p>
    );
  }
  return (
    <div role="alert" className={styles.alert}>
      <p>{error ?? "The content couldn't be loaded."}</p>
      <Button size="sm" onClick={() => reload().catch(() => undefined)}>
        Try again
      </Button>
    </div>
  );
}

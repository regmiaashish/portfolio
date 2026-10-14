import { ButtonLink } from "../../components/ui/Button";
import { StatusDot } from "../../components/ui/StatusDot";
import { useAdminContent } from "../adminContent";
import { adminApi } from "../api";
import styles from "../Admin.module.css";
import { LoadState } from "../components/LoadState";
import { OrderedList } from "../components/OrderedList";
import { useFlash } from "../useFlash";

export function ProjectsPage() {
  const { status, content, reload } = useAdminContent();
  const flash = useFlash();

  return (
    <>
      <div className={styles.pageHeader}>
        <h1>Projects</h1>
        <ButtonLink to="/admin/projects/new" variant="primary">
          Add project
        </ButtonLink>
      </div>
      {flash && (
        <p role="status" className={styles.status}>
          {flash}
        </p>
      )}
      {status !== "ready" || !content ? (
        <LoadState />
      ) : (
        <OrderedList
          label="Projects in display order"
          noun="project"
          items={content.projects.map((project) => ({
            id: project.id,
            title: project.name,
            editTo: `/admin/projects/${project.id}`,
            meta: (
              <>
                <StatusDot status={project.published ? "done" : "idle"} label="" />
                <span>{project.published ? "Published" : "Draft (hidden from the site)"}</span>
                <span aria-hidden="true">·</span>
                <span>/work/{project.slug}</span>
              </>
            ),
          }))}
          onReorder={async (ids) => {
            await adminApi.orderProjects(ids);
            await reload();
          }}
          onDelete={async (id) => {
            await adminApi.deleteProject(id);
            await reload();
          }}
        />
      )}
    </>
  );
}

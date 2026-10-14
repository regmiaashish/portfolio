import { useState } from "react";

import { Panel } from "../components/console/Panel";
import { ReadoutList, Readout } from "../components/console/Readout";
import { StatusLight } from "../components/console/StatusLight";
import { Container } from "../components/layout/Container";
import { PageHeader } from "../components/layout/PageHeader";
import { Button, ButtonAnchor, ButtonLink } from "../components/ui/Button";
import { useContent } from "../hooks/useContent";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { usePageMeta } from "../hooks/usePageMeta";
import { RESUME_DOWNLOAD_URL } from "../lib/resume";
import pageStyles from "./Page.module.css";
import styles from "./ResumePage.module.css";

/** Wide screens with a precise pointer render PDFs inline reliably; phones and tablets often don't. */
const INLINE_VIEWER_QUERY = "(min-width: 64rem) and (pointer: fine)";

export function ResumePage() {
  const { content, settled } = useContent();
  const { profile } = content;
  const resumeUrl = profile.resume_url ?? null;
  // The bundled snapshot has no résumé, so until the API has answered, "none" may just mean
  // "not loaded yet": show a loading state rather than telling a recruiter it doesn't exist.
  const pending = !resumeUrl && !settled;

  usePageMeta({
    title: "Résumé",
    description: resumeUrl
      ? `${profile.name}'s résumé: ${profile.role} in ${profile.location}. View it here or download the PDF.`
      : `${profile.name}'s résumé is not available yet.`,
    robots: resumeUrl || pending ? undefined : "noindex",
  });

  return (
    <>
      <PageHeader
        path="~/resume"
        title="Résumé"
        intro={
          resumeUrl || pending
            ? "Read it here, open it in a new tab, or download the PDF."
            : "My résumé isn't published yet."
        }
      />
      <Container className={pageStyles.pageBody}>
        {pending ? (
          <Panel title="resume.pdf" status={<StatusLight status="running" label="loading" />}>
            {/* Same box as the "not published" state (invisible copy), so the swap can't shift. */}
            <div className={styles.reserve} aria-busy="true">
              <div className={styles.reserveGhost} aria-hidden="true">
                <NotPublishedBody />
              </div>
              <p className={styles.reserveLabel}>Loading the latest résumé…</p>
            </div>
          </Panel>
        ) : resumeUrl ? (
          <ResumeAvailable url={resumeUrl} name={profile.name} role={profile.role} location={profile.location} />
        ) : (
          <Panel title="resume.pdf" status={<StatusLight status="idle" label="not published" />}>
            <NotPublishedBody />
          </Panel>
        )}
      </Container>
    </>
  );
}

interface AvailableProps {
  url: string;
  name: string;
  role: string;
  location: string;
}

function ResumeAvailable({ url, name, role, location }: AvailableProps) {
  const wide = useMediaQuery(INLINE_VIEWER_QUERY);
  const [previewRequested, setPreviewRequested] = useState(false);
  const showViewer = wide || previewRequested;

  return (
    <div className={styles.layout}>
      <Panel
        as="section"
        aria-labelledby="resume-viewer-heading"
        title="resume.pdf"
        status={<StatusLight status="online" label="published" />}
        bodyClassName={styles.viewerBody}
      >
        <h2 id="resume-viewer-heading" className="visually-hidden">
          Résumé document
        </h2>
        <div className={styles.actions}>
          <ButtonAnchor variant="primary" href={RESUME_DOWNLOAD_URL}>
            Download PDF
          </ButtonAnchor>
          <ButtonAnchor variant="secondary" href={url} target="_blank" rel="noopener noreferrer">
            Open in new tab<span className="visually-hidden"> (opens in a new tab)</span>
          </ButtonAnchor>
          {!showViewer && (
            <Button variant="ghost" onClick={() => setPreviewRequested(true)}>
              Preview here
            </Button>
          )}
        </div>
        {showViewer ? (
          <iframe
            className={styles.viewer}
            src={url}
            title={`${name}'s résumé (PDF)`}
            loading="lazy"
          />
        ) : (
          <p className={styles.note}>
            On phones and tablets the PDF opens most reliably in a new tab or after downloading.
          </p>
        )}
      </Panel>

      <aside className={styles.side} aria-label="Résumé summary">
        <Panel title="whoami">
          <ReadoutList minColumn="100%">
            <Readout label="name">{name}</Readout>
            <Readout label="role">{role}</Readout>
            <Readout label="location">{location}</Readout>
          </ReadoutList>
        </Panel>
        <Panel title="next">
          <div className={styles.actions}>
            <ButtonLink to="/work" variant="secondary">
              See my work
            </ButtonLink>
            <ButtonLink to="/contact" variant="ghost">
              Get in touch
            </ButtonLink>
          </div>
        </Panel>
      </aside>
    </div>
  );
}

function NotPublishedBody() {
  return (
    <div className={styles.empty}>
      <p>
        It will appear here as soon as it&apos;s uploaded. In the meantime, my work and career are
        on the site, and I&apos;m happy to send a copy directly.
      </p>
      <div className={styles.actions}>
        <ButtonLink to="/contact" variant="primary">
          Ask for a copy
        </ButtonLink>
        <ButtonLink to="/about" variant="secondary">
          Career and skills
        </ButtonLink>
      </div>
    </div>
  );
}

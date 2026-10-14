import { Section } from "../components/layout/Section";
import { PageHeader } from "../components/layout/PageHeader";
import { Stack } from "../components/layout/Stack";
import { AboutIntro } from "../components/sections/AboutIntro";
import { Career } from "../components/sections/Career";
import { StackSection } from "../components/sections/StackSection";
import { ButtonLink } from "../components/ui/Button";
import { useContent } from "../hooks/useContent";
import { usePageMeta } from "../hooks/usePageMeta";

export function AboutPage() {
  const { profile } = useContent().content;
  usePageMeta({ title: "About", description: profile.summary });
  const hasResume = Boolean(profile.resume_url);
  return (
    <>
      <PageHeader path="~/about" title="About" />
      <AboutIntro />
      <Career />
      <StackSection />
      <Section
        id="about-next"
        label="~/about/next"
        title="See the work, or get in touch"
        intro="Case studies of what I've built, or a message straight to my inbox."
      >
        <Stack direction="row" gap={3}>
          <ButtonLink to="/contact" variant="primary">
            Get in touch
          </ButtonLink>
          <ButtonLink to="/work" variant="secondary">
            See my work
          </ButtonLink>
          {hasResume && (
            <ButtonLink to="/resume" variant="ghost">
              View résumé
            </ButtonLink>
          )}
        </Stack>
      </Section>
    </>
  );
}

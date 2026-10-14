import { PageHeader } from "../components/layout/PageHeader";
import { Contact } from "../components/sections/Contact";
import { useContent } from "../hooks/useContent";
import { usePageMeta } from "../hooks/usePageMeta";

export function ContactPage() {
  const { profile } = useContent().content;
  usePageMeta({
    title: "Contact",
    description: `Contact ${profile.name}: send a message or email ${profile.email}.`,
  });
  return (
    <>
      <PageHeader
        path="~/contact"
        title="Contact"
        intro="Send a message, or reach me directly. I work from Kathmandu (UTC+5:45)."
      />
      <Contact />
    </>
  );
}

import { Career } from "../components/sections/Career";
import { Contact } from "../components/sections/Contact";
import { Hero } from "../components/sections/Hero";
import { StackSection } from "../components/sections/StackSection";
import { Work } from "../components/sections/Work";
import { usePageMeta } from "../hooks/usePageMeta";

export function HomePage() {
  usePageMeta();
  return (
    <>
      <Hero />
      <Work />
      <StackSection />
      <Career />
      <Contact />
    </>
  );
}

import { useContent } from "../../hooks/useContent";
import { Panel } from "../console/Panel";
import { Section } from "../layout/Section";
import { Reveal } from "../motion/Reveal";
import { ChipList } from "../ui/Chip";
import styles from "./StackSection.module.css";

function slug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/**
 * "How I work" is written only from the skill groups' own descriptions (no new claims);
 * the panels below then list the tools for each group.
 */
export function StackSection() {
  const skillGroups = useContent().content.skills;
  if (skillGroups.length === 0) return null;
  return (
    <Section id="stack" label="~/about/stack" title="Stack and how I work">
      <Reveal>
        <Panel title="how-i-work" className={styles.principlesPanel}>
          <h3 className="visually-hidden">How I work</h3>
          <ul className={styles.principles}>
            {skillGroups.map((group) => (
              <li key={group.id} className={styles.principle}>
                <span className={`mono ${styles.principleLabel}`}>{slug(group.title)}</span>
                <p>{group.description}</p>
              </li>
            ))}
          </ul>
        </Panel>
      </Reveal>

      <div className={styles.groups}>
        {skillGroups.map((group, index) => (
          <Reveal key={group.id} delayMs={index * 70}>
            <Panel
              title={`stack.${slug(group.title)}`}
              status={<span className="mono">{group.skills.length} skills</span>}
              className={styles.group}
            >
              <h3 className={styles.groupTitle}>{group.title}</h3>
              <ChipList items={group.skills} label={`${group.title} skills`} />
            </Panel>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

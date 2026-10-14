import { useContent } from "../../hooks/useContent";
import { Section } from "../layout/Section";
import { Grid, Stack } from "../layout/Stack";
import { ChipList } from "../ui/Chip";

export function StackSection() {
  const skillGroups = useContent().content.skills;
  return (
    <Section id="stack" title="Stack and how I work">
      <Grid minColumn="17rem" gap={6}>
        {skillGroups.map((group) => (
          <Stack key={group.id} gap={3}>
            <h3>{group.title}</h3>
            <p>{group.description}</p>
            <ChipList items={group.skills} label={`${group.title} skills`} />
          </Stack>
        ))}
      </Grid>
    </Section>
  );
}

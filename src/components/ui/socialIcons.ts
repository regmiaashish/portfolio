import type { SocialLink } from "../../data/profile";
import type { IconName } from "./Icon";

export const SOCIAL_ICONS: Record<SocialLink["label"], IconName> = {
  GitHub: "github",
  LinkedIn: "linkedin",
  Instagram: "instagram",
};

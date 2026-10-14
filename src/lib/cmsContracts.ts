/**
 * Types for the content API and the admin API (Phase 4.5), derived from the backend's
 * OpenAPI schema (./api-types, regenerated with `npm run gen:api`). The contract itself is
 * documented in portfolio-website-backend/docs/ADMIN_CMS_CONTRACT.md.
 */
import type { components } from "./api-types";

type Schemas = components["schemas"];

export const SOCIAL_KINDS = ["github", "linkedin", "instagram", "x", "website"] as const satisfies readonly Schemas["SocialOut"]["kind"][];
export type SocialKind = Schemas["SocialOut"]["kind"];

export type Social = Schemas["SocialOut"];
export type Phone = Schemas["PhoneOut"];
export type Profile = Schemas["ProfileOut"];
export type ProjectImage = Schemas["ImageOut"];
export type CaseStudy = Schemas["CaseStudyOut"];
export type Project = Schemas["ProjectOut"];
export type CareerEntry = Schemas["CareerOut"];
export type SkillGroup = Schemas["SkillGroupOut"];
/** `GET /api/v1/content`. */
export type SiteContent = Schemas["ContentOut"];

export type AdminProjectImage = Schemas["AdminImageOut"];
export type AdminProject = Schemas["AdminProjectOut"];
export type AdminCareerEntry = Schemas["AdminCareerOut"];
export type AdminSkillGroup = Schemas["AdminSkillGroupOut"];
/** `GET /api/v1/admin/content`: includes unpublished projects and positions. */
export type AdminContent = Schemas["AdminContentOut"];

export type ImageInput = Schemas["ImageInput"];
export type ProjectInput = Schemas["ProjectInput"];
export type CareerInput = Schemas["CareerInput"];
export type SkillGroupInput = Schemas["SkillGroupInput"];
export type OrderInput = Schemas["OrderInput"];
export type UploadRequest = Schemas["UploadRequest"];
/** "project_image" (default) or "resume" (PDF only). */
export type UploadPurpose = UploadRequest["purpose"];
/** `POST /api/v1/admin/uploads`: a presigned S3 POST. */
export type UploadTicket = Schemas["UploadOut"];

/** `GET /api/v1/auth/me` data. */
export type AdminUser = Pick<Schemas["UserRead"], "id" | "name" | "email" | "is_active" | "is_superuser">;

/** One Pitch Me run, as recorded by the backend when its stream ended. */
export type PitchOutcome = Schemas["PitchRunSummary"]["outcome"];
export type PitchRunSummary = Schemas["PitchRunSummary"];
export type PitchRunDetail = Schemas["PitchRunDetail"];
/** `GET /api/v1/admin/pitches`: newest first, paginated. */
export type PitchRunList = Schemas["PitchRunList"];
/** `GET /api/v1/admin/pitches/stats`. */
export type PitchStats = Schemas["PitchStats"];

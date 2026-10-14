/**
 * Request/response types for the contact and visitor-context endpoints, derived from
 * the backend's OpenAPI schema (src/lib/api-types.ts, regenerated with `npm run gen:api`).
 */
import type { Schemas } from "./api";

export type ContactRequest = Schemas["ContactRequest"];
export type WeatherContext = Schemas["WeatherContext"];

/**
 * Responses are read defensively: an older backend, or a provider outage on the server,
 * can leave fields out, and the greeting must still render. Hence `Partial`.
 */
export type VisitorContext = Partial<Schemas["VisitorContext"]>;

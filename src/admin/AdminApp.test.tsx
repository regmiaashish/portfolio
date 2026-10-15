import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { jsonResponse } from "../test/fetch";
import { ADMIN_USER, adminContentFixture, mockAdminApi } from "../test/admin";
import { renderApp } from "../test/render";
import { CSRF_HEADER } from "./api";

afterEach(() => {
  vi.restoreAllMocks();
});

function expectAdminHeaders(call: { init: RequestInit; headers: Record<string, string> }) {
  expect(call.init.credentials).toBe("include");
  expect(call.headers["X-Requested-With"]).toBe(CSRF_HEADER["X-Requested-With"]);
}

describe("admin session", () => {
  it("is lazy-loaded: shows a loading state first, then the dashboard", async () => {
    mockAdminApi();
    renderApp("/admin");

    expect(screen.getByRole("status")).toHaveTextContent(/Loading the admin/);
    expect(await screen.findByRole("heading", { level: 1, name: "Projects" })).toBeInTheDocument();
  });

  it("keeps the admin out of search engines", async () => {
    mockAdminApi();
    renderApp("/admin");

    await screen.findByRole("heading", { level: 1, name: "Projects" });
    expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute(
      "content",
      "noindex, nofollow",
    );
  });

  it("shows the login form when there is no session, after one refresh attempt", async () => {
    const { calls } = mockAdminApi({}, { signedIn: false });
    renderApp("/admin");

    expect(await screen.findByRole("heading", { name: "Site admin" })).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(calls("POST", "/api/v1/auth/refresh")).toHaveLength(1);
  });

  it("signs in and opens the dashboard", async () => {
    const user = userEvent.setup();
    let signedIn = false;
    const { calls } = mockAdminApi({
      "GET /api/v1/auth/me": () =>
        signedIn
          ? jsonResponse(200, { success: true, message: "ok", data: ADMIN_USER })
          : jsonResponse(401, { success: false, message: "Not authenticated.", errors: null }),
      "POST /api/v1/auth/login": () => {
        signedIn = true;
        return jsonResponse(200, { success: true, message: "Login successful.", data: null });
      },
    });
    renderApp("/admin");

    await user.type(await screen.findByLabelText("Email"), "admin@example.com");
    await user.type(screen.getByLabelText("Password"), "a-long-enough-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Projects" })).toBeInTheDocument();
    const [login] = calls("POST", "/api/v1/auth/login");
    expect(login.body).toEqual({ email: "admin@example.com", password: "a-long-enough-password" });
    expectAdminHeaders(login);
    expect(screen.getByText(`Signed in as ${ADMIN_USER.name}`)).toBeInTheDocument();
  });

  it("shows the backend's message when sign-in fails", async () => {
    const user = userEvent.setup();
    mockAdminApi(
      {
        "POST /api/v1/auth/login": () =>
          jsonResponse(401, { success: false, message: "Invalid email or password.", errors: null }),
      },
      { signedIn: false },
    );
    renderApp("/admin");

    await user.type(await screen.findByLabelText("Email"), "admin@example.com");
    await user.type(screen.getByLabelText("Password"), "wrong-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid email or password.");
  });

  it("refuses accounts that aren't superusers", async () => {
    mockAdminApi({}, { user: { ...ADMIN_USER, is_superuser: false } });
    renderApp("/admin");

    expect(await screen.findByRole("heading", { name: "No admin access" })).toBeInTheDocument();
  });

  it("returns to the login form when the session expires mid-edit", async () => {
    const user = userEvent.setup();
    mockAdminApi({
      "PUT /api/v1/admin/profile": () =>
        jsonResponse(401, { success: false, message: "Invalid or expired token.", errors: null }),
    });
    renderApp("/admin/profile");

    const tagline = await screen.findByLabelText("Tagline");
    await user.clear(tagline);
    await user.type(tagline, "A new tagline.");
    await user.click(screen.getByRole("button", { name: "Save profile" }));

    expect(await screen.findByText("Your session expired. Please sign in again.")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("logs out", async () => {
    const user = userEvent.setup();
    const { calls } = mockAdminApi();
    renderApp("/admin");

    await user.click(await screen.findByRole("button", { name: "Log out" }));

    expect(await screen.findByText("You're signed out.")).toBeInTheDocument();
    expect(calls("POST", "/api/v1/auth/logout")).toHaveLength(1);
  });
});

describe("profile editor", () => {
  it("saves the whole profile with credentials and the CSRF header", async () => {
    const user = userEvent.setup();
    const { calls, content } = mockAdminApi({
      "PUT /api/v1/admin/profile": (init) => jsonResponse(200, JSON.parse(String(init?.body))),
    });
    renderApp("/admin/profile");

    const tagline = await screen.findByLabelText("Tagline");
    await user.clear(tagline);
    await user.type(tagline, "Backends that stay up.");
    await user.click(screen.getByRole("button", { name: "Save profile" }));

    expect(await screen.findByText(/Profile saved/)).toBeInTheDocument();
    const [save] = calls("PUT", "/api/v1/admin/profile");
    expectAdminHeaders(save);
    expect(save.body).toEqual({ ...content.profile, tagline: "Backends that stay up." });
  });

  it("starts from an empty form when no profile has been saved yet", async () => {
    const content = adminContentFixture();
    mockAdminApi({
      "GET /api/v1/admin/content": () => jsonResponse(200, { ...content, profile: null }),
    });
    renderApp("/admin/profile");

    expect(await screen.findByText(/No profile is saved yet/)).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("");
  });

  it("can drop the phone number and add a social link", async () => {
    const user = userEvent.setup();
    const { calls } = mockAdminApi({
      "PUT /api/v1/admin/profile": (init) => jsonResponse(200, JSON.parse(String(init?.body))),
    });
    renderApp("/admin/profile");

    await user.click(await screen.findByLabelText("Show a phone number"));
    await user.click(screen.getByRole("button", { name: "Add social link" }));
    const labels = screen.getAllByLabelText("Label");
    await user.type(labels[labels.length - 1], "Blog");
    const links = screen.getAllByLabelText("Link");
    await user.clear(links[links.length - 1]);
    await user.type(links[links.length - 1], "https://blog.example.com");
    await user.click(screen.getByRole("button", { name: "Save profile" }));

    await screen.findByText(/Profile saved/);
    const [save] = calls("PUT", "/api/v1/admin/profile");
    expect(save.body.phone).toBeNull();
    expect(save.body.socials.at(-1)).toEqual({
      kind: "website",
      label: "Blog",
      href: "https://blog.example.com",
    });
  });
});

describe("projects", () => {
  it("lists projects with their publish state", async () => {
    mockAdminApi();
    renderApp("/admin/projects");

    const list = await screen.findByRole("list", { name: "Projects in display order" });
    const rows = within(list).getAllByRole("listitem");
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent("Published");
    expect(rows[2]).toHaveTextContent("Draft");
    expect(within(rows[0]).getByRole("button", { name: /Move up/ })).toBeDisabled();
    expect(within(rows[2]).getByRole("button", { name: /Move down/ })).toBeDisabled();
  });

  it("creates a project with an auto-suggested slug", async () => {
    const user = userEvent.setup();
    const { calls } = mockAdminApi({
      "POST /api/v1/admin/projects": () => jsonResponse(201, {}),
    });
    renderApp("/admin/projects/new");

    await user.type(await screen.findByLabelText("Name"), "Edge Cache Service");
    expect(screen.getByLabelText("Slug")).toHaveValue("edge-cache-service");
    await user.type(screen.getByLabelText("Category"), "Infrastructure");
    await user.type(screen.getByLabelText("Summary"), "A cache in front of the API.");
    await user.type(screen.getByLabelText("Stack"), "Go{Enter}Redis,");
    await user.click(screen.getByLabelText("Published"));
    await user.type(screen.getByLabelText("Source code link (optional)"), "https://github.com/x/edge");
    await user.click(screen.getByRole("button", { name: "Create project" }));

    expect(await screen.findByText("Saved “Edge Cache Service”.")).toBeInTheDocument();
    const [create] = calls("POST", "/api/v1/admin/projects");
    expectAdminHeaders(create);
    expect(create.body).toEqual({
      slug: "edge-cache-service",
      name: "Edge Cache Service",
      category: "Infrastructure",
      summary: "A cache in front of the API.",
      stack: ["Go", "Redis"],
      repo_url: "https://github.com/x/edge",
      demo_url: null,
      image: null,
      case_study: null,
      published: true,
    });
  });

  it("blocks invalid input before calling the API", async () => {
    const user = userEvent.setup();
    const { calls } = mockAdminApi();
    renderApp("/admin/projects/new");

    await user.type(await screen.findByLabelText("Name"), "x".repeat(5));
    const slug = screen.getByLabelText("Slug");
    await user.clear(slug);
    await user.type(slug, "Bad Slug");
    await user.type(screen.getByLabelText("Source code link (optional)"), "ftp://example.com");
    await user.click(screen.getByRole("button", { name: "Create project" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Fix the highlighted fields");
    expect(screen.getByLabelText("Slug")).toHaveAccessibleDescription(/lowercase letters/);
    expect(screen.getByLabelText("Source code link (optional)")).toHaveAccessibleDescription(
      /https:\/\//,
    );
    expect(screen.getByLabelText("Category")).toHaveAccessibleDescription(/required/);
    expect(calls("POST", "/api/v1/admin/projects")).toHaveLength(0);
  });

  it("moves focus to the error summary on every blocked save", async () => {
    const user = userEvent.setup();
    mockAdminApi();
    renderApp("/admin/projects/new");

    const create = await screen.findByRole("button", { name: "Create project" });
    await user.click(create);
    const alert = await screen.findByRole("alert");
    await waitFor(() => expect(alert).toHaveFocus());

    // Same message the second time: focus still comes back to it.
    await user.click(create);
    await waitFor(() => expect(screen.getByRole("alert")).toHaveFocus());
  });

  it("edits a project, keeping its image", async () => {
    const user = userEvent.setup();
    const { calls, content } = mockAdminApi({
      [`PUT /api/v1/admin/projects/${"00000000-0000-4000-8000-000000000001"}`]: () =>
        jsonResponse(200, {}),
    });
    renderApp("/admin/projects/00000000-0000-4000-8000-000000000001");

    const summary = await screen.findByLabelText("Summary");
    await user.clear(summary);
    await user.type(summary, "Updated summary.");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await screen.findByText(/Saved “/);
    const [update] = calls("PUT", "/api/v1/admin/projects/00000000-0000-4000-8000-000000000001");
    const original = content.projects[0];
    expect(update.body.summary).toBe("Updated summary.");
    expect(update.body.slug).toBe(original.slug);
    expect(update.body.image).toEqual({
      key: original.image?.key,
      alt: original.image?.alt,
      width: original.image?.width,
      height: original.image?.height,
    });
  });

  it("shows a 409 slug conflict on the slug field", async () => {
    const user = userEvent.setup();
    mockAdminApi({
      "POST /api/v1/admin/projects": () =>
        jsonResponse(409, { success: false, message: "That slug is already used.", errors: null }),
    });
    renderApp("/admin/projects/new");

    await user.type(await screen.findByLabelText("Name"), "Jarvis");
    await user.type(screen.getByLabelText("Category"), "App");
    await user.type(screen.getByLabelText("Summary"), "Voice assistant.");
    await user.click(screen.getByRole("button", { name: "Create project" }));

    await waitFor(() =>
      expect(screen.getByLabelText("Slug")).toHaveAccessibleDescription(/already used/),
    );
  });

  it("maps a 422 from the server onto the right fields", async () => {
    const user = userEvent.setup();
    mockAdminApi({
      "POST /api/v1/admin/projects": () =>
        jsonResponse(422, {
          success: false,
          message: "Request validation failed.",
          errors: [{ loc: ["body", "summary"], msg: "String should have at most 300 characters", type: "x" }],
        }),
    });
    renderApp("/admin/projects/new");

    await user.type(await screen.findByLabelText("Name"), "Thing");
    await user.type(screen.getByLabelText("Category"), "App");
    await user.type(screen.getByLabelText("Summary"), "Ok.");
    await user.click(screen.getByRole("button", { name: "Create project" }));

    await waitFor(() =>
      expect(screen.getByLabelText("Summary")).toHaveAccessibleDescription(/at most 300/),
    );
  });

  it("reorders with Move down", async () => {
    const user = userEvent.setup();
    const { calls, content } = mockAdminApi({
      "PUT /api/v1/admin/projects/order": () => new Response(null, { status: 204 }),
    });
    renderApp("/admin/projects");

    const list = await screen.findByRole("list", { name: "Projects in display order" });
    await user.click(within(list).getAllByRole("button", { name: /Move down/ })[0]);

    await waitFor(() => expect(calls("PUT", "/api/v1/admin/projects/order")).toHaveLength(1));
    const [order] = calls("PUT", "/api/v1/admin/projects/order");
    expectAdminHeaders(order);
    expect(order.body).toEqual({
      ids: [content.projects[1].id, content.projects[0].id, content.projects[2].id],
    });
    expect(await screen.findByText(/Moved .* down to position 2/)).toBeInTheDocument();
  });

  it("deletes after confirming in a dialog", async () => {
    const user = userEvent.setup();
    const target = "00000000-0000-4000-8000-000000000002";
    const { calls, content } = mockAdminApi({
      [`DELETE /api/v1/admin/projects/${target}`]: () => new Response(null, { status: 204 }),
    });
    renderApp("/admin/projects");
    const name = content.projects[1].name;

    await user.click(await screen.findByRole("button", { name: `Delete ${name}` }));
    const dialog = screen.getByRole("dialog", { name: "Delete this project?" });
    expect(dialog).toHaveTextContent(name);
    expect(within(dialog).getByRole("button", { name: "Cancel" })).toHaveFocus();

    await user.click(within(dialog).getByRole("button", { name: "Delete project" }));

    await waitFor(() => expect(calls("DELETE", `/api/v1/admin/projects/${target}`)).toHaveLength(1));
    expectAdminHeaders(calls("DELETE", `/api/v1/admin/projects/${target}`)[0]);
  });

  it("asks before leaving a form with unsaved changes", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    mockAdminApi();
    renderApp("/admin/projects/new");

    await user.type(await screen.findByLabelText("Name"), "Unsaved");
    await user.click(screen.getByRole("link", { name: "Career" }));

    expect(confirm).toHaveBeenCalled();
    expect(screen.getByRole("heading", { level: 1, name: "New project" })).toBeInTheDocument();

    confirm.mockReturnValue(true);
    await user.click(screen.getByRole("link", { name: "Career" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Career" })).toBeInTheDocument();
  });

  it("doesn't ask when nothing changed", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm");
    mockAdminApi();
    renderApp("/admin/projects/new");

    await screen.findByLabelText("Name");
    await user.click(screen.getByRole("link", { name: "Skills" }));

    expect(confirm).not.toHaveBeenCalled();
    expect(await screen.findByRole("heading", { level: 1, name: "Skills" })).toBeInTheDocument();
  });
});

describe("career and skills", () => {
  it("creates a career entry", async () => {
    const user = userEvent.setup();
    const { calls } = mockAdminApi({ "POST /api/v1/admin/career": () => jsonResponse(201, {}) });
    renderApp("/admin/career/new");

    await user.type(await screen.findByLabelText("Role"), "Backend engineer");
    await user.type(screen.getByLabelText("Company"), "Acme");
    await user.type(screen.getByLabelText("Period"), "2027");
    await user.type(screen.getByLabelText("Summary"), "Built things.");
    await user.click(screen.getByRole("button", { name: "Create entry" }));

    await screen.findByText(/Saved “Backend engineer, Acme”/);
    expect(calls("POST", "/api/v1/admin/career")[0].body).toEqual({
      role: "Backend engineer",
      company: "Acme",
      period: "2027",
      summary: "Built things.",
    });
  });

  it("requires at least one skill in a group", async () => {
    const user = userEvent.setup();
    const { calls } = mockAdminApi();
    renderApp("/admin/skills/new");

    await user.type(await screen.findByLabelText("Title"), "Data");
    await user.type(screen.getByLabelText("Description"), "Pipelines.");
    await user.click(screen.getByRole("button", { name: "Create skill group" }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(calls("POST", "/api/v1/admin/skills")).toHaveLength(0);
  });

  it("removes a skill chip with its button", async () => {
    const user = userEvent.setup();
    const { calls, content } = mockAdminApi({
      [`PUT /api/v1/admin/skills/${"00000000-0000-4000-8000-000000000200"}`]: () =>
        jsonResponse(200, {}),
    });
    renderApp("/admin/skills/00000000-0000-4000-8000-000000000200");

    await user.click(await screen.findByRole("button", { name: "Remove Python" }));
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await screen.findByText(/Saved “/);
    const [save] = calls("PUT", "/api/v1/admin/skills/00000000-0000-4000-8000-000000000200");
    expect(save.body.skills).toEqual(content.skills[0].skills.filter((skill) => skill !== "Python"));
  });
});

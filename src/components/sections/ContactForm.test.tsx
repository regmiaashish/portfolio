import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ThemeProvider } from "../../app/ThemeProvider";
import { jsonResponse, mockApi } from "../../test/fetch";
import { ContactForm } from "./ContactForm";

function renderForm() {
  return render(
    <ThemeProvider>
      <ContactForm />
    </ThemeProvider>,
  );
}

async function fillValid(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Name"), "Ada Lovelace");
  await user.type(screen.getByLabelText("Email"), "ada@example.com");
  await user.type(screen.getByLabelText(/^Message/), "Let's build something.");
}

describe("ContactForm", () => {
  it("blocks submission and focuses the first invalid field", async () => {
    const user = userEvent.setup();
    const fetchMock = mockApi({});
    renderForm();

    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByText("Please enter your name.")).toBeInTheDocument();
    expect(screen.getByText("Please enter your email address.")).toBeInTheDocument();
    expect(screen.getByText("Please write a message.")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveFocus();
    expect(screen.getByLabelText("Name")).toHaveAttribute("aria-invalid", "true");
  });

  it("validates an email on blur", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText("Email"), "not-an-email");
    await user.tab();

    expect(screen.getByText(/valid email address/)).toBeInTheDocument();
  });

  it("posts the exact body, without a Turnstile token when no site key is set", async () => {
    const user = userEvent.setup();
    const fetchMock = mockApi({
      "POST /api/v1/contact": () =>
        jsonResponse(202, {
          success: true,
          message: "Thanks! Your message is on its way.",
          data: null,
        }),
    });
    renderForm();

    await fillValid(user);
    await user.click(screen.getByRole("button", { name: "Send message" }));

    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent("Message sent");
    expect(status).toHaveTextContent("Thanks! Your message is on its way.");
    await waitFor(() => expect(status).toHaveFocus());

    const init = fetchMock.mock.calls[0][1]!;
    expect(JSON.parse(String(init.body))).toEqual({
      name: "Ada Lovelace",
      email: "ada@example.com",
      message: "Let's build something.",
      website: "",
    });
    expect(init.credentials).toBe("omit");
  });

  it("treats the old backend's 200 as success too", async () => {
    const user = userEvent.setup();
    mockApi({ "POST /api/v1/contact": () => jsonResponse(200, { success: true }) });
    renderForm();

    await fillValid(user);
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Message sent");
  });

  it("shows field errors from a 422 and keeps the input", async () => {
    const user = userEvent.setup();
    mockApi({
      "POST /api/v1/contact": () =>
        jsonResponse(422, {
          success: false,
          message: "Request validation failed.",
          errors: [{ loc: ["body", "email"], msg: "Email domain is not allowed.", type: "value_error" }],
        }),
    });
    renderForm();

    await fillValid(user);
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Request validation failed.");
    expect(screen.getByText("Email domain is not allowed.")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("Ada Lovelace");
  });

  it("shows the backend's rate-limit message", async () => {
    const user = userEvent.setup();
    mockApi({
      "POST /api/v1/contact": () =>
        jsonResponse(
          429,
          { success: false, message: "Too many requests. Try again in 42 seconds.", errors: null },
          { "Retry-After": "42" },
        ),
    });
    renderForm();

    await fillValid(user);
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Too many requests. Try again in 42 seconds.",
    );
  });

  it("explains a network failure, offers email, and keeps the input", async () => {
    const user = userEvent.setup();
    mockApi({}); // offline
    renderForm();

    await fillValid(user);
    await user.click(screen.getByRole("button", { name: "Send message" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Can't reach the server.");
    expect(alert).toHaveTextContent("regmiaashish660@gmail.com");
    expect(screen.getByLabelText(/^Message/)).toHaveValue("Let's build something.");
    expect(screen.getByRole("button", { name: "Send message" })).toBeEnabled();
  });

  it("disables the button while sending", async () => {
    const user = userEvent.setup();
    let resolve: (response: Response) => void = () => {};
    mockApi({ "POST /api/v1/contact": () => new Promise<Response>((r) => (resolve = r)) });
    renderForm();

    await fillValid(user);
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(screen.getByRole("button", { name: "Sending…" })).toBeDisabled();
    expect(screen.getByRole("form", { name: "Contact form" })).toHaveAttribute("aria-busy", "true");
    resolve(jsonResponse(202, { success: true, message: "ok", data: null }));
    expect(await screen.findByRole("status")).toBeInTheDocument();
  });

  it("shows a live character count", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/^Message/), "Hello");

    expect(screen.getByText("5 / 1000 characters")).toBeInTheDocument();
  });

  it("keeps the honeypot out of the tab order and the accessibility tree", () => {
    renderForm();

    const honeypot = document.getElementById("contact-website")!;
    expect(honeypot).toHaveAttribute("tabindex", "-1");
    expect(honeypot).toHaveAttribute("autocomplete", "off");
    expect(honeypot.closest("[aria-hidden='true']")).not.toBeNull();
    expect(screen.queryByRole("textbox", { name: "Website" })).not.toBeInTheDocument();
  });
});

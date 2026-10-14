import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { PasswordInput } from "./Field";

describe("PasswordInput", () => {
  it("is hidden by default and the toggle reveals and hides it", async () => {
    const user = userEvent.setup();
    render(<PasswordInput label="Password" name="password" defaultValue="s3cret-value" />);
    const input = screen.getByLabelText("Password");

    expect(input).toHaveAttribute("type", "password");
    const toggle = screen.getByRole("button", { name: "Show password" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(toggle).toHaveAttribute("aria-controls", input.id);

    await user.click(toggle);
    expect(input).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Hide password" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await user.click(screen.getByRole("button", { name: "Hide password" }));
    expect(input).toHaveAttribute("type", "password");
  });

  it("works from the keyboard and never submits the form", async () => {
    const user = userEvent.setup();
    let submitted = false;
    render(
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submitted = true;
        }}
      >
        <PasswordInput label="Password" name="password" />
      </form>,
    );

    await user.tab(); // into the input
    await user.tab(); // onto the toggle
    expect(screen.getByRole("button", { name: "Show password" })).toHaveFocus();
    await user.keyboard("{Enter}");

    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "text");
    expect(submitted).toBe(false);
  });

  it("keeps the value when toggling", async () => {
    const user = userEvent.setup();
    render(<PasswordInput label="Password" name="password" />);
    const input = screen.getByLabelText("Password");

    await user.type(input, "mypassword@123##");
    await user.click(screen.getByRole("button", { name: "Show password" }));

    expect(input).toHaveValue("mypassword@123##");
  });
});

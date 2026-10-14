import { describe, expect, it } from "vitest";

import { fieldErrorsFromApi, validateContact, validateField } from "./contactValidation";

describe("contact validation", () => {
  it("accepts a valid message", () => {
    expect(
      validateContact({ name: "Ada", email: "ada@example.com", message: "Hello", website: "" }),
    ).toEqual({});
  });

  it("requires every field and trims whitespace", () => {
    expect(Object.keys(validateContact({ name: " ", email: "", message: "\n", website: "" }))).toEqual([
      "name",
      "email",
      "message",
    ]);
  });

  it("mirrors the backend length limits", () => {
    expect(validateField("name", "a".repeat(100))).toBeUndefined();
    expect(validateField("name", "a".repeat(101))).toMatch(/under 100/);
    expect(validateField("message", "a".repeat(1000))).toBeUndefined();
    expect(validateField("message", "a".repeat(1001))).toMatch(/under 1000/);
  });

  it("rejects malformed email addresses", () => {
    for (const email of ["ada", "ada@", "@example.com", "ada@example", "a b@example.com"]) {
      expect(validateField("email", email)).toMatch(/valid email/);
    }
  });

  it("maps backend errors onto fields, ignoring unknown locations", () => {
    expect(
      fieldErrorsFromApi([
        { loc: ["body", "email"], msg: "value is not a valid email address", type: "value_error" },
        { loc: ["body", "turnstile_token"], msg: "required", type: "missing" },
        "garbage",
      ]),
    ).toEqual({ email: "value is not a valid email address" });
    expect(fieldErrorsFromApi(null)).toEqual({});
  });
});

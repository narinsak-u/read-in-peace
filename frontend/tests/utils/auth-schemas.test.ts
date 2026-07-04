import { describe, it, expect } from "vitest";
import { validateSignIn, validateSignUp } from "~/utils/auth-schemas";

describe("validateSignIn", () => {
  it("returns null for valid input", () => {
    expect(validateSignIn({ email: "user@example.com", password: "password123" })).toBeNull();
  });

  it("returns error for empty email", () => {
    expect(validateSignIn({ email: "", password: "password123" })).toBe("Please enter your email");
  });

  it("returns error for malformed email", () => {
    const err = validateSignIn({ email: "not-an-email", password: "password123" });
    expect(err).toBe("Please enter a valid email address");
  });

  it("returns error for empty password", () => {
    const err = validateSignIn({ email: "user@example.com", password: "" });
    expect(err).toBe("Please enter a password");
  });

  it("returns error for short password", () => {
    const err = validateSignIn({ email: "user@example.com", password: "1234567" });
    expect(err).toBe("Password must be at least 8 characters");
  });

  it("returns first error for multiple issues", () => {
    const err = validateSignIn({ email: "", password: "" });
    expect(err).toBe("Please enter your email");
  });
});

describe("validateSignUp", () => {
  it("returns null for valid input", () => {
    expect(validateSignUp({
      name: "Alice",
      email: "alice@example.com",
      password: "secure123",
    })).toBeNull();
  });

  it("returns error for empty name", () => {
    const err = validateSignUp({
      name: "",
      email: "alice@example.com",
      password: "secure123",
    });
    expect(err).toBe("Please enter your name");
  });

  it("returns name error before email error", () => {
    const err = validateSignUp({
      name: "",
      email: "alice@example.com",
      password: "secure123",
    });
    expect(err).toBe("Please enter your name");
  });

  it("inherits email validation from signIn schema", () => {
    const err = validateSignUp({
      name: "Alice",
      email: "bad",
      password: "secure123",
    });
    expect(err).toBe("Please enter a valid email address");
  });

  it("inherits password length validation from signIn schema", () => {
    const err = validateSignUp({
      name: "Alice",
      email: "alice@example.com",
      password: "short",
    });
    expect(err).toBe("Password must be at least 8 characters");
  });
});

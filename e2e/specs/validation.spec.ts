// Acceptance Test
// Traces to: L2-004
// Description: The contact form validates on submit then live per field, shows a focused
// error summary that links to each invalid field, and enforces the length limits.

import { expect, test } from "../fixtures/test";

const EMAIL_ERROR = "Enter a complete email address like name@organization.org";
const MESSAGE_ERROR =
  "Tell us a little about your project so we know who to put on the call";

test.describe("Contact form validation", () => {
  test("empty form sends nothing, shows a focused two-item summary and marks both fields", async ({
    home,
    api,
  }) => {
    await home.goto();

    await home.submit();

    await expect(home.errorSummary).toBeFocused();
    await expect(home.errorSummary).toContainText(
      "Two things to fix before we can send this",
    );
    await expect(home.fieldError(EMAIL_ERROR)).toBeVisible();
    await expect(home.fieldError(MESSAGE_ERROR)).toBeVisible();
    await expect(home.emailField).toHaveAttribute("aria-invalid", "true");
    await expect(home.messageField).toHaveAttribute("aria-invalid", "true");
    expect(api.submissions).toHaveLength(0);
  });

  test("an incomplete email shows the email error and names one problem", async ({
    home,
    api,
  }) => {
    await home.goto();
    await home.fill("ruth@", "We need an app.");

    await home.submit();

    await expect(home.errorSummary).toContainText(
      "One thing to fix before we can send this",
    );
    await expect(home.fieldError(EMAIL_ERROR)).toBeVisible();
    await expect(home.emailField).toHaveAttribute("aria-invalid", "true");
    await expect(home.messageField).not.toHaveAttribute("aria-invalid", "true");
    expect(api.submissions).toHaveLength(0);
  });

  test("a whitespace-only message shows the message error", async ({
    home,
  }) => {
    await home.goto();
    await home.fill("ruth@hopehouse.org", "    ");

    await home.submit();

    await expect(home.fieldError(MESSAGE_ERROR)).toBeVisible();
  });

  test("each summary link focuses its field", async ({ home }) => {
    await home.goto();
    await home.submit();

    await home.errorSummary
      .getByRole("link", { name: "Tell us a little about your project" })
      .click();
    await expect(home.messageField).toBeFocused();

    await home.errorSummary
      .getByRole("link", { name: "Enter a complete email address" })
      .click();
    await expect(home.emailField).toBeFocused();
  });

  test("an error clears as soon as the field is corrected, without another submit", async ({
    home,
  }) => {
    await home.goto();
    await home.submit();

    await home.emailField.fill("ruth@hopehouse.org");

    await expect(home.fieldError(EMAIL_ERROR)).toBeHidden();
    await expect(home.emailField).not.toHaveAttribute("aria-invalid", "true");
    await expect(home.errorSummary).toContainText(
      "One thing to fix before we can send this",
    );

    await home.messageField.fill("We need an app.");
    await expect(home.errorSummary).toBeHidden();
  });

  test("a message over 2000 characters is refused with the limit stated", async ({
    home,
    api,
  }) => {
    await home.goto();
    await home.fill("ruth@hopehouse.org", "x".repeat(2001));

    await home.submit();

    await expect(
      home.fieldError("Message must be 2000 characters or fewer"),
    ).toBeVisible();
    expect(api.submissions).toHaveLength(0);
  });

  test("a message of exactly 2000 characters is sent", async ({
    home,
    api,
  }) => {
    await home.goto();
    await home.fill("ruth@hopehouse.org", "x".repeat(2000));

    await home.submit();

    await expect(home.confirmation).toBeVisible();
    expect(api.submissions).toHaveLength(1);
  });

  test("an email over 254 characters is refused with the limit stated", async ({
    home,
  }) => {
    await home.goto();
    await home.fill(`${"a".repeat(250)}@x.org`, "Hello");

    await home.submit();

    await expect(
      home.fieldError("Email must be 254 characters or fewer"),
    ).toBeVisible();
  });
});

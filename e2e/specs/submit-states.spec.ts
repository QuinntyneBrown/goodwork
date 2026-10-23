// Acceptance Test
// Traces to: L2-005, L2-006, L2-007, L2-010
// Description: The sending, sent and error states of the contact form, and the
// handling of server-side validation errors.

import { expect, test } from "../fixtures/test";

test.describe("Sending", () => {
  test("shows the busy state after 300 ms, keeps the values and makes the fields read-only", async ({
    home,
    api,
  }) => {
    api.behavior = { kind: "accept", delayMs: 1200 };
    await home.goto();
    await home.fillValid();

    await home.submit();

    await expect(home.sendingButton).toHaveAttribute("aria-busy", "true");
    await expect(home.emailField).toHaveAttribute("readonly", "");
    await expect(home.messageField).toHaveAttribute("readonly", "");
    await expect(home.emailField).toHaveValue("ruth.okonkwo@hopehouse.org");
    await expect(home.page.getByText("Sending your request")).toBeVisible();
    await expect(home.confirmation).toBeVisible();
  });

  test("does not send a second request while one is in flight", async ({
    home,
    api,
  }) => {
    api.behavior = { kind: "accept", delayMs: 800 };
    await home.goto();
    await home.fillValid();

    await home.submit();
    await home.emailField.press("Enter");
    await home.emailField.press("Enter");

    await expect(home.confirmation).toBeVisible();
    expect(api.submissions).toHaveLength(1);
  });

  test("does not show the busy state when the request finishes within 300 ms", async ({
    home,
  }) => {
    await home.goto();
    await home.fillValid();

    await home.submit();

    await expect(home.confirmation).toBeVisible();
    await expect(home.sendingButton).toHaveCount(0);
  });
});

test.describe("Sent", () => {
  test("replaces the form with a focused confirmation naming the address", async ({
    home,
    api,
  }) => {
    await home.goto();
    await home.fill(
      "  ruth.okonkwo@hopehouse.org ",
      "We need a case management app.",
    );

    await home.submit();

    await expect(home.confirmation).toBeFocused();
    await expect(home.confirmation).toContainText(
      "ruth.okonkwo@hopehouse.org within two business days",
    );
    await expect(home.emailField).toHaveCount(0);
    expect(api.submissions).toEqual([
      {
        email: "ruth.okonkwo@hopehouse.org",
        message: "We need a case management app.",
        website: "",
      },
    ]);
  });

  test('"Send another request" shows an empty form with focus in the email field', async ({
    home,
  }) => {
    await home.goto();
    await home.fillValid();
    await home.submit();

    await home.sendAnother.click();

    await expect(home.emailField).toBeFocused();
    await expect(home.emailField).toHaveValue("");
    await expect(home.messageField).toHaveValue("");
    await expect(home.confirmation).toHaveCount(0);
  });

  test('"Start a project" focuses the confirmation once the form has been replaced', async ({
    home,
  }) => {
    await home.goto();
    await home.fillValid();
    await home.submit();

    await home.startProject.click();

    await expect(home.confirmation).toBeFocused();
  });
});

test.describe("Error", () => {
  for (const behavior of [
    { name: "a server error", value: { kind: "server-error" } as const },
    { name: "a rate limit", value: { kind: "rate-limited" } as const },
    { name: "a network failure", value: { kind: "network-failure" } as const },
  ]) {
    test(`${behavior.name} shows a focused alert, keeps the input and offers a mailto fallback`, async ({
      home,
      api,
    }) => {
      api.behavior = behavior.value;
      await home.goto();
      await home.fillValid();

      await home.submit();

      await expect(home.failureAlert).toBeFocused();
      await expect(home.failureAlert.getByRole("link")).toHaveAttribute(
        "href",
        "mailto:hello@goodwork.dev",
      );
      await expect(home.emailField).toHaveValue("ruth.okonkwo@hopehouse.org");
      await expect(home.messageField).toHaveValue(/case management app/);
      await expect(home.tryAgainButton).toBeVisible();
    });
  }

  test('"Try again" sends the request and shows the sent state', async ({
    home,
    api,
  }) => {
    api.behavior = { kind: "server-error" };
    await home.goto();
    await home.fillValid();
    await home.submit();
    await expect(home.failureAlert).toBeVisible();

    api.behavior = { kind: "accept" };
    await home.tryAgainButton.click();

    await expect(home.confirmation).toBeVisible();
    expect(api.submissions).toHaveLength(1);
  });

  test("a request with no response fails after 15 seconds", async ({
    home,
    api,
  }) => {
    api.behavior = { kind: "never-responds" };
    await home.page.clock.install();
    await home.goto();
    await home.fillValid();

    await home.submit();
    await home.page.clock.fastForward(14_000);
    await expect(home.failureAlert).toHaveCount(0);
    await home.page.clock.fastForward(2_000);

    await expect(home.failureAlert).toBeVisible();
  });

  test("server-side field errors are shown like client-side ones", async ({
    home,
    api,
  }) => {
    api.behavior = {
      kind: "invalid",
      errors: { email: ["The server rejected this email address"] },
    };
    await home.goto();
    await home.fillValid();

    await home.submit();

    await expect(home.errorSummary).toBeFocused();
    await expect(
      home.fieldError("The server rejected this email address"),
    ).toBeVisible();
    await expect(home.emailField).toHaveAttribute("aria-invalid", "true");
    await expect(home.failureAlert).toHaveCount(0);
  });
});

test.describe("Honeypot", () => {
  test("a visitor never fills the hidden field, so it is sent empty", async ({
    home,
    api,
  }) => {
    await home.goto();
    await home.fillValid();
    await expect(home.honeypot).toHaveValue("");

    await home.submit();

    await expect(home.confirmation).toBeVisible();
    expect(api.submissions[0]?.website).toBe("");
  });
});

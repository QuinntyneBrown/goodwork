// Acceptance Test
// Traces to: L2-001, L2-003
// Description: The home page renders its sections and copy without signing in,
// and the contact form offers exactly the two required fields.

import { expect, test } from "../fixtures/test";

test.describe("Home page content", () => {
  test("shows the header, hero, both services, contact form and footer", async ({
    home,
  }) => {
    await home.goto();

    await expect(home.brand).toBeVisible();
    await expect(home.startProject).toBeVisible();
    await expect(home.eyebrow).toBeVisible();
    await expect(home.heading).toHaveText(
      "Professional apps, at a price a small mission can afford.",
    );
    await expect(home.page.getByText("Christian-owned studio")).toBeVisible();
    await expect(home.page.getByText("Why it costs less:")).toBeVisible();
    await expect(
      home.page.getByRole("heading", {
        level: 2,
        name: "Tell us about your project",
      }),
    ).toBeVisible();
    await expect(home.page.getByRole("contentinfo")).toContainText("Goodwork");
  });

  test("lists exactly two services", async ({ home }) => {
    await home.goto();

    await expect(home.serviceCards).toHaveCount(2);
    await expect(
      home.page.getByRole("heading", { level: 3, name: "Web and mobile apps" }),
    ).toBeVisible();
    await expect(
      home.page.getByRole("heading", { level: 3, name: "Websites" }),
    ).toBeVisible();
  });

  test("shows no price figure", async ({ home }) => {
    await home.goto();

    await expect(home.main).not.toContainText(/[$€£]\s?\d/);
  });

  test("links the studio email address as a mailto link", async ({ home }) => {
    await home.goto();

    await expect(home.footerEmail).toHaveAttribute(
      "href",
      "mailto:hello@goodwork.dev",
    );
  });

  test("names Goodwork in the document title", async ({ home }) => {
    await home.goto();

    await expect(home.page).toHaveTitle(/Goodwork/);
  });

  test("offers only the email and message fields, both marked required, with the help text linked", async ({
    home,
  }) => {
    await home.goto();

    await expect(home.emailField).toBeVisible();
    await expect(home.messageField).toBeVisible();
    await expect(home.page.getByText("(required)")).toHaveCount(2);
    await expect(home.sendButton).toBeVisible();
    await expect(home.replyHint).toBeVisible();
    await expect(home.messageField).toHaveAccessibleDescription(
      "A sentence or two is plenty. Who you serve, what you need, and roughly when.",
    );
    // Besides the two fields, the form holds only the honeypot, which no visitor can see or reach.
    await expect(home.page.locator("form input, form textarea")).toHaveCount(3);
    await expect(home.honeypot).not.toBeInViewport();
    await expect(home.honeypot).toHaveAttribute("tabindex", "-1");
  });
});

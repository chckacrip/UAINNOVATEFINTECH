import { test, expect } from "@playwright/test";

test.describe("Landing and login", () => {
  test("home page has Get started and links to login", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /MotionFi/i })).toBeVisible();
    const getStarted = page.getByRole("link", { name: /Get started/i });
    await expect(getStarted).toBeVisible();
    await getStarted.click();
    await expect(page).toHaveURL(/\/login/);
  });

  test("login page shows sign in form and links", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByPlaceholder("you@example.com")).toBeVisible();
    await expect(page.getByPlaceholder("••••••••")).toBeVisible();
    await expect(page.getByRole("button", { name: /Sign In/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Don't have an account/ })).toBeVisible();
  });

  test("sign in with test user redirects to dashboard", async ({ page }) => {
    const email = process.env.E2E_TEST_EMAIL;
    const password = process.env.E2E_TEST_PASSWORD;
    test.skip(!email || !password, "E2E_TEST_EMAIL and E2E_TEST_PASSWORD must be set");

    await page.goto("/login");
    await page.getByPlaceholder("you@example.com").fill(email);
    await page.getByPlaceholder("••••••••").fill(password);
    await page.getByRole("button", { name: /Sign In/i }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    await expect(page.getByRole("heading", { name: /Dashboard/i })).toBeVisible({ timeout: 5000 });
  });
});

import { test, expect } from "@playwright/test";

const uniqueEmail = () => `e2e_${Date.now()}_${Math.random().toString(16).slice(2)}@example.com`;

test("auth page renders and protected app redirects when logged out", async ({ page }) => {
  await page.goto("/app");
  await expect(page).toHaveURL(/\/auth$/);
  await expect(page.getByText(/Welcome back|Create your account/i)).toBeVisible();
});

test("new user can sign up and reach app shell", async ({ page }) => {
  const email = uniqueEmail();

  await page.goto("/auth");
  await page.getByRole("button", { name: /sign up/i }).click();
  await page.getByPlaceholder("you@domain.com").fill(email);
  await page.getByPlaceholder("••••••••").fill("password123");
  await page.getByRole("button", { name: /create account/i }).click();

  await expect(page).toHaveURL(/\/app/);
  await expect(page.getByText(/Habitify|Dashboard|streak|habit/i).first()).toBeVisible();
});

test("login rejects wrong credentials with visible error", async ({ page }) => {
  await page.goto("/auth");
  await page.getByPlaceholder("you@domain.com").fill(uniqueEmail());
  await page.getByPlaceholder("••••••••").fill("password123");
  await page.getByRole("button", { name: /enter habitify/i }).click();

  await expect(page.getByText(/invalid credentials|something went wrong/i)).toBeVisible();
});

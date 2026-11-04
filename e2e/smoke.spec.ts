import { expect, test } from "@playwright/test";

test("setup page explains how to connect Supabase", async ({ page }) => {
  await page.goto("/setup");

  await expect(page.getByRole("heading", { name: "Hubungkan Pocketly ke Supabase" })).toBeVisible();
  await expect(page.getByText("NEXT_PUBLIC_SUPABASE_URL=…")).toBeVisible();
  await expect(page.getByRole("link", { name: "Lanjut ke masuk" })).toHaveAttribute("href", "/login");
});

test("login form has accessible email and password fields", async ({ page }) => {
  await page.goto("/login");

  await expect(page.getByRole("heading", { name: "Masuk ke Pocketly" })).toBeVisible();
  await expect(page.getByLabel("Email")).toHaveAttribute("type", "email");
  await expect(page.getByLabel("Kata sandi")).toHaveAttribute("type", "password");
  await expect(page.getByRole("button", { name: "Masuk" })).toBeVisible();
});

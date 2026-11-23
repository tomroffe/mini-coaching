import { expect, type Page } from "@playwright/test";

export const ADMIN = { email: "admin@example.com", password: "change-me-now" };

export async function login(page: Page, email = ADMIN.email, password = ADMIN.password) {
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

export async function logout(page: Page) {
  await page.context().clearCookies();
}

/** Admin creates an invite via the UI and returns the invite URL path. */
export async function invite(page: Page, name: string, email: string, role: "coach" | "parent" | "admin") {
  await page.goto("/admin");
  const form = page.locator("form").filter({ has: page.getByRole("button", { name: "Create invite" }) });
  await form.getByPlaceholder("Full name").fill(name);
  await form.getByPlaceholder("Email").fill(email);
  await form.locator("select[name=role]").selectOption(role);
  await form.getByRole("button", { name: "Create invite" }).click();
  const box = page.locator("div", { has: page.getByText(`Invite created for ${name}.`) }).last();
  const code = box.locator("code");
  await expect(code).toContainText("/invite/");
  const url = await code.textContent();
  return new URL(url!).pathname;
}

export async function acceptInvite(page: Page, path: string, password: string) {
  await logout(page);
  await page.goto(path);
  await page.getByLabel("Choose a password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).not.toHaveURL(/\/invite\//);
}

export async function assignCoach(page: Page, coachName: string, group = "U6") {
  await page.goto("/admin");
  const table = page.locator("table").first();
  const col = await table.locator("thead th").allTextContents();
  const idx = col.findIndex((c) => c.trim() === group);
  const row = table.locator("tbody tr").filter({ hasText: coachName });
  await row.locator("td").nth(idx).getByRole("button").click();
  await expect(row.locator("td").nth(idx)).toContainText("Assistant");
}

export async function addPlayer(page: Page, first: string, last: string, consent: boolean) {
  await page.goto("/players?age=U6");
  await page.getByRole("button", { name: "Add player" }).click();
  await page.getByLabel("First name").fill(first);
  await page.getByLabel("Last name").fill(last);
  if (consent) await page.getByText("Parent/guardian has given photo consent").click();
  await page.locator("form").getByRole("button", { name: "Add player" }).click();
  await expect(page).toHaveURL(/\/players\/[0-9a-f-]{36}$/);
  return page.url().split("/").pop()!;
}

import { expect, test, type Page } from "@playwright/test";
import { acceptInvite, invite, login } from "./helpers";

test.describe.configure({ mode: "serial" });

async function overflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

async function expectNoOverflow(page: Page, route: string) {
  await page.goto(route);
  await page.waitForLoadState("networkidle");
  expect(await overflow(page), `horizontal overflow on ${route}`).toBeLessThanOrEqual(1);
}

test("phone: bottom tabs, More sheet and an animated drill", async ({ page }) => {
  await login(page);
  const tabs = page.getByRole("navigation", { name: "Main" });
  for (const t of ["Home", "Season", "Register", "Players"]) await expect(tabs.getByRole("link", { name: t })).toBeVisible();

  // everything else lives in the More sheet
  await tabs.getByRole("button", { name: "More" }).click();
  const sheet = page.getByRole("dialog", { name: "More" });
  for (const t of ["Plans", "Drills", "Coaches", "Awards", "Admin"]) await expect(sheet.getByRole("link", { name: t })).toBeVisible();
  await expect(sheet.getByRole("button", { name: /mode/ })).toBeVisible();
  await expect(sheet.getByRole("button", { name: "Sign out" })).toBeVisible();
  await sheet.getByRole("link", { name: "Drills" }).click();
  await expect(page).toHaveURL(/\/drills$/);
  await expect(sheet).toHaveCount(0);

  await page.getByText("Fox Tails").click();
  await page.getByRole("button", { name: "Next step" }).click();
  await expect(page.getByText("Step 1 of 3")).toBeVisible();
});

test("phone: no page scrolls sideways (staff)", async ({ page }) => {
  await login(page);
  await page.goto("/sessions");
  const plan = await page.locator("a[href^='/sessions/']").first().getAttribute("href");
  await page.goto("/players?age=U6");
  const player = await page.locator("a[href^='/players/']").first().getAttribute("href");
  const routes = ["/", "/season?age=U6", "/sessions", plan!, "/drills", "/drills/cross-the-river", "/drills/u7-tag/edit", "/players", player!, "/register", "/coaches?age=U6", "/awards", "/admin", "/admin/people"];
  for (const r of routes) await expectNoOverflow(page, r);
});

test("phone: admin settings fit the screen", async ({ page }) => {
  await login(page);
  await page.goto("/admin");
  const viewport = page.viewportSize()!.width;
  for (const heading of ["Invite someone", "Coach assignments", "Seasons", "Age groups"]) {
    const card = page.locator("div.rounded-2xl", { has: page.getByRole("heading", { name: heading, exact: true }) }).first();
    const box = (await card.boundingBox())!;
    expect(box.x + box.width, `${heading} card fits`).toBeLessThanOrEqual(viewport);
  }
  await expect(page.getByLabel("Start")).toBeVisible();
  await expect(page.getByLabel("End")).toBeVisible();
  const save = page.getByRole("button", { name: "Save U12" });
  await save.scrollIntoViewIfNeeded();
  const sb = (await save.boundingBox())!;
  expect(sb.x + sb.width, "age-group Save button is on screen").toBeLessThanOrEqual(viewport);
});

test("phone: no page scrolls sideways (parent)", async ({ page }) => {
  await login(page);
  const path = await invite(page, "Mia Mobile", "mia@example.com", "parent");
  await acceptInvite(page, path, "miapassword12");
  for (const r of ["/parent", "/parent/schedule", "/parent/account"]) await expectNoOverflow(page, r);
  const tabs = page.getByRole("navigation", { name: "Main" });
  for (const t of ["My child", "Schedule", "Account"]) await expect(tabs.getByRole("link", { name: t })).toBeVisible();
});

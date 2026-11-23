import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test("phone: bottom tabs, animated drill and register work at iPhone size", async ({ page }) => {
  await login(page);
  const tabs = page.locator("nav").last();
  await expect(tabs.getByRole("link", { name: "Season" })).toBeVisible();
  await tabs.getByRole("link", { name: "Drills" }).click();
  await expect(page).toHaveURL(/\/drills$/);
  await page.getByText("Fox Tails").click();
  await page.getByRole("button", { name: "Next step" }).click();
  await expect(page.getByText("Step 1 of 3")).toBeVisible();
  // no horizontal overflow on the page body
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

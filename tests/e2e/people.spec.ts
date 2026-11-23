import { expect, test } from "@playwright/test";
import { acceptInvite, invite, login } from "./helpers";

test.describe.configure({ mode: "serial" });

const rows = (page: import("@playwright/test").Page) => page.getByTestId("person-row");

test("people page: role filter, search, and no self-delete", async ({ page }) => {
  await login(page);
  await page.goto("/admin");
  await page.getByRole("link", { name: "Manage people →" }).click();
  await expect(page).toHaveURL(/\/admin\/people$/);

  await page.getByRole("radio", { name: /Parents/ }).click();
  await expect(rows(page).filter({ hasText: "Pat Parent" })).toHaveCount(1);
  await expect(rows(page).filter({ hasText: "Casey Coach" })).toHaveCount(0);

  await page.getByRole("radio", { name: /^All/ }).click();
  await page.getByLabel("Search people").fill("casey");
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page).first()).toContainText("U6");

  // search matches a child's name too
  await page.getByLabel("Search people").fill("Ben Stokes");
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page).first()).toContainText("Pat Parent");

  // own row has no actions menu and a locked role
  await page.getByLabel("Search people").fill("admin@example.com");
  await expect(rows(page).first()).toContainText("(you)");
  await expect(rows(page).first().getByRole("button", { name: /Actions for/ })).toHaveCount(0);
  await expect(rows(page).first().getByLabel(/Role for/).filter({ visible: true })).toBeDisabled();
});

test("deactivate hides from the active list; reactivate brings it back", async ({ page }) => {
  await login(page);
  await page.goto("/admin/people");
  await page.getByRole("button", { name: "Actions for Casey Coach" }).click();
  await page.getByRole("menuitem", { name: /Deactivate/ }).click();
  await expect(rows(page).filter({ hasText: "Casey Coach" })).toHaveCount(0);
  await page.getByLabel("Status").selectOption("inactive");
  await expect(rows(page).filter({ hasText: "Casey Coach" })).toContainText("Deactivated");
  await page.getByRole("button", { name: "Actions for Casey Coach" }).click();
  await page.getByRole("menuitem", { name: /Reactivate/ }).click();
  await expect(rows(page).filter({ hasText: "Casey Coach" })).toHaveCount(0);
  await page.getByLabel("Status").selectOption("active");
  await expect(rows(page).filter({ hasText: "Casey Coach" })).toHaveCount(1);
});

test("delete a parent but keep their children in the roster", async ({ page }) => {
  await login(page);
  await page.goto("/admin/people");
  await page.getByRole("button", { name: "Actions for Pat Parent" }).click();
  await page.getByRole("menuitem", { name: /Delete permanently/ }).click();
  const dialog = page.getByRole("dialog", { name: "Delete Pat Parent" });
  await expect(dialog).toContainText("Links to");
  const confirm = dialog.getByRole("button", { name: "Delete permanently" });
  await dialog.getByLabel("Confirm name").fill("pat");
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel("Confirm name").fill("Pat Parent");
  await confirm.click();
  await expect(page.getByRole("status").filter({ hasText: "Pat Parent deleted." })).toBeVisible();
  await expect(rows(page).filter({ hasText: "Pat Parent" })).toHaveCount(0);

  await page.goto("/players?age=U6");
  await expect(page.getByText("Ben Stokes")).toBeVisible();
  await expect(page.getByText("Arthur Parent")).toBeVisible();
});

test("delete a parent together with their only-linked children", async ({ page, browser }) => {
  await login(page);
  const path = await invite(page, "Quinn Parent", "quinn@example.com", "parent");
  // link Quinn to Ben (now has no other parent)
  await acceptInvite(page, path, "quinnpassword1");
  await login(page);
  await page.goto("/players?age=U6");
  await page.getByText("Ben Stokes").click();
  await page.waitForURL(/\/players\/[0-9a-f-]{36}$/);
  await page.getByPlaceholder("parent@email").fill("quinn@example.com");
  await page.getByRole("button", { name: "Link", exact: true }).click();
  await expect(page.getByText("Quinn Parent linked")).toBeVisible();

  await page.goto("/admin/people");
  await page.getByRole("button", { name: "Actions for Quinn Parent" }).click();
  await page.getByRole("menuitem", { name: /Delete permanently/ }).click();
  const dialog = page.getByRole("dialog", { name: "Delete Quinn Parent" });
  await dialog.getByText(/Also delete Ben Stokes/).click();
  await dialog.getByLabel("Confirm name").fill("Quinn Parent");
  await dialog.getByRole("button", { name: "Delete permanently" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Quinn Parent deleted (and 1 child record)." })).toBeVisible();

  await page.goto("/players?age=U6");
  await expect(page.getByText("Ben Stokes")).toHaveCount(0);

  // deleted user can't sign in
  const ctx = await browser.newContext();
  const p2 = await ctx.newPage();
  await p2.goto("/login");
  await p2.getByLabel("Email").fill("quinn@example.com");
  await p2.getByLabel("Password").fill("quinnpassword1");
  await p2.getByRole("button", { name: "Sign in" }).click();
  await expect(p2.getByText("That email and password don't match.")).toBeVisible();
  await ctx.close();
});

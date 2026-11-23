import { devices, expect, test, type Browser, type Page } from "@playwright/test";
import { login } from "./helpers";

test.describe.configure({ mode: "serial" });

async function openQr(page: Page) {
  await page.goto("/players?age=U6");
  await page.getByRole("button", { name: "Enrol a family" }).click();
  const qr = page.locator("[data-enrol-url]");
  await expect(qr.locator("svg")).toBeVisible();
  return (await qr.getAttribute("data-enrol-url"))!;
}

async function phone(browser: Browser) {
  const ctx = await browser.newContext({ ...devices["iPhone 13"] });
  return ctx.newPage();
}

async function addChild(p: Page, i: number, first: string, last: string, consent: "yes" | "no", dob = "") {
  await p.getByLabel("First name").nth(i).fill(first);
  await p.getByLabel("Last name").nth(i).fill(last);
  if (dob) await p.getByLabel("Date of birth (optional)").nth(i).fill(dob);
  await p.getByText(consent === "yes" ? "Yes, photos are OK" : "No photos").nth(i).click();
}

test("parent self-enrols two children from a one-time QR; coach sees it live", async ({ page, browser }) => {
  await login(page);
  const url = await openQr(page);
  expect(url).toMatch(/\/enrol\/[\w-]{20,}$/);

  const parent = await phone(browser);
  await parent.goto(url);
  await expect(parent.getByRole("heading", { name: /Join\s+U6/ })).toBeVisible();
  await parent.getByLabel("Your name").fill("Robin Parent");
  await parent.getByLabel("Email").fill("robin@example.com");
  await parent.getByLabel("Choose a password").fill("robinpassword1");
  await parent.getByLabel("Confirm password").fill("robinpassword1");
  await addChild(parent, 0, "Arthur", "Parent", "yes", "2021-04-02");
  await parent.getByRole("button", { name: "Add another child" }).click();
  await addChild(parent, 1, "Bea", "Parent", "no");
  await parent.getByRole("button", { name: "Enrol", exact: true }).click();
  await expect(parent).toHaveURL(/\/parent\?welcome=1$/);
  await expect(parent.getByText("You're in!")).toBeVisible();
  await expect(parent.getByRole("heading", { name: "Arthur" })).toBeVisible();
  await expect(parent.getByRole("heading", { name: "Bea" })).toBeVisible();

  // coach's screen flips to "enrolled"
  await expect(page.getByTestId("enrolled-names")).toHaveText("Arthur Parent, Bea Parent", { timeout: 10_000 });

  // one-time: reusing the code fails
  await parent.goto(url);
  await expect(parent.getByText("This code has expired")).toBeVisible();

  // closing the modal refreshes the roster
  await page.getByRole("button", { name: "Done" }).click();
  await expect(page.getByText("Arthur Parent")).toBeVisible();
  await expect(page.getByText("Bea Parent")).toBeVisible();
  await parent.context().close();
});

test("existing parent signs in on a new QR to add a sibling", async ({ page, browser }) => {
  await login(page);
  const url = await openQr(page);
  const parent = await phone(browser);
  await parent.goto(url);
  await parent.getByRole("tab", { name: "I already have an account" }).click();
  await parent.getByLabel("Email").fill("robin@example.com");
  await parent.getByLabel("Password").fill("wrong-password");
  await addChild(parent, 0, "Cal", "Parent", "no");
  await parent.getByRole("button", { name: "Enrol", exact: true }).click();
  await expect(parent.locator("form [role=alert]")).toHaveText("That email and password don't match.");
  // fields are kept after an error
  await expect(parent.getByLabel("First name")).toHaveValue("Cal");
  await parent.getByLabel("Password").fill("robinpassword1");
  await parent.getByRole("button", { name: "Enrol", exact: true }).click();
  await expect(parent).toHaveURL(/\/parent\?welcome=1$/);
  for (const n of ["Arthur", "Bea", "Cal"]) await expect(parent.getByRole("heading", { name: n })).toBeVisible();
  await parent.context().close();
});

test("new account can't reuse an existing email; consent is required", async ({ page, browser }) => {
  await login(page);
  const url = await openQr(page);
  const parent = await phone(browser);
  await parent.goto(url);
  await parent.getByLabel("Your name").fill("Someone Else");
  await parent.getByLabel("Email").fill("robin@example.com");
  await parent.getByLabel("Choose a password").fill("anotherpass1");
  await parent.getByLabel("Confirm password").fill("anotherpass1");
  await parent.getByLabel("First name").fill("Dee");
  await parent.getByLabel("Last name").fill("Else");
  // bypass the browser's own required-check to prove the server enforces consent
  await parent.locator("form").evaluate((f) => ((f as HTMLFormElement).noValidate = true));
  await parent.getByRole("button", { name: "Enrol", exact: true }).click();
  await expect(parent.locator("form [role=alert]")).toContainText("photo consent");
  await parent.getByText("No photos").click();
  await parent.getByRole("button", { name: "Enrol", exact: true }).click();
  await expect(parent.locator("form [role=alert]")).toContainText("already has an account");
  await parent.context().close();
});

test("photo consent from enrolment is enforced and the parent can change it", async ({ page, browser }) => {
  await login(page);
  await page.goto("/players?age=U6");
  await page.getByText("Bea Parent").click();
  await expect(page.getByText("Photo upload is locked until photo consent is recorded")).toBeVisible();
  const beaUrl = page.url();

  const parent = await phone(browser);
  await login(parent, "robin@example.com", "robinpassword1");
  const bea = parent.locator("section", { has: parent.getByRole("heading", { name: "Bea" }) });
  await expect(bea.getByText("Photo consent: No")).toBeVisible();
  await bea.getByRole("button", { name: "Change" }).click();
  await expect(bea.getByText("Photo consent: Yes")).toBeVisible();

  await expect
    .poll(async () => {
      await page.goto(beaUrl);
      return page.locator("input[name=photo]").count();
    })
    .toBe(1);

  // withdrawing again asks for confirmation
  parent.once("dialog", (d) => d.accept());
  await bea.getByRole("button", { name: "Change" }).click();
  await expect(bea.getByText("Photo consent: No")).toBeVisible();
  await parent.context().close();
});

test("parent can unenrol a child (typed confirmation) and it's gone for coaches too", async ({ page, browser }) => {
  const parent = await phone(browser);
  await login(parent, "robin@example.com", "robinpassword1");
  await parent.getByRole("link", { name: "Account" }).click();
  await expect(parent).toHaveURL(/\/parent\/account$/);
  const cal = parent.locator("div.rounded-xl", { hasText: "Cal Parent" });
  await cal.getByRole("button", { name: "Unenrol" }).click();
  const confirm = cal.getByRole("button", { name: "Unenrol Cal" });
  await expect(confirm).toBeDisabled();
  await cal.getByLabel("Type Cal to confirm").fill("cal");
  await confirm.click();
  await expect(parent.getByText("Cal has been unenrolled and their record deleted.")).toBeVisible();
  await parent.getByRole("link", { name: "My child" }).click();
  await expect(parent.getByRole("heading", { name: "Cal" })).toHaveCount(0);
  await expect(parent.getByRole("heading", { name: "Bea" })).toBeVisible();
  await parent.context().close();

  await login(page);
  await page.goto("/players?age=U6");
  await expect(page.getByText("Bea Parent")).toBeVisible();
  await expect(page.getByText("Cal Parent")).toHaveCount(0);
});

test("deleting an account keeps children shared with another parent, deletes the rest", async ({ page, browser }) => {
  // link a second parent (Pat, created in club.spec) to Arthur
  await login(page);
  await page.goto("/players?age=U6");
  await page.getByText("Arthur Parent").click();
  await page.waitForURL(/\/players\/[0-9a-f-]{36}$/);
  await page.getByPlaceholder("parent@email").fill("pat@example.com");
  await page.getByRole("button", { name: "Link", exact: true }).click();
  await expect(page.getByText("Pat Parent linked")).toBeVisible();

  const parent = await phone(browser);
  await login(parent, "robin@example.com", "robinpassword1");
  await parent.goto("/parent/account");
  await expect(parent.getByText("Arthur stays enrolled: another parent is linked to them.")).toBeVisible();
  await expect(parent.getByText("Bea will be unenrolled and their record deleted.")).toBeVisible();
  await parent.getByRole("button", { name: "Delete my account" }).click();
  await parent.getByLabel("Enter your password to confirm").fill("not-my-password");
  await parent.getByRole("button", { name: "Permanently delete account" }).click();
  await expect(parent.getByText("That password isn't right.")).toBeVisible();
  await parent.getByLabel("Enter your password to confirm").fill("robinpassword1");
  await parent.getByRole("button", { name: "Permanently delete account" }).click();
  await expect(parent).toHaveURL(/\/login\?deleted=1$/);
  await expect(parent.getByText("Your account has been deleted.")).toBeVisible();

  // can't sign in any more
  await parent.getByLabel("Email").fill("robin@example.com");
  await parent.getByLabel("Password").fill("robinpassword1");
  await parent.getByRole("button", { name: "Sign in" }).click();
  await expect(parent.getByText("That email and password don't match.")).toBeVisible();
  await parent.context().close();

  // Arthur kept (Pat still linked), Bea deleted
  await page.goto("/players?age=U6");
  await expect(page.getByText("Arthur Parent")).toBeVisible();
  await expect(page.getByText("Bea Parent")).toHaveCount(0);
  const pat = await phone(browser);
  await login(pat, "pat@example.com", "parentpassword1");
  await expect(pat.getByRole("heading", { name: "Arthur" })).toBeVisible();
  await pat.context().close();
});

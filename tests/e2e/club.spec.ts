import path from "node:path";
import { expect, test } from "@playwright/test";
import { acceptInvite, addPlayer, assignCoach, invite, login, logout } from "./helpers";

test.describe.configure({ mode: "serial" });

// A 1x1 PNG for photo upload
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/akmLyoAAAAASUVORK5CYII=", "base64");

test("unauthenticated users are sent to login", async ({ page }) => {
  await page.goto("/players");
  await expect(page).toHaveURL(/\/login/);
  const res = await page.request.get("/api/media/players/00000000-0000-0000-0000-000000000000.jpg");
  expect(res.status()).toBe(401);
});

test("seeded U6 season matches the PDF: 23 sessions", async ({ page }) => {
  await login(page);
  await page.goto("/season?age=U6");
  await expect(page.getByText("23 training sessions")).toBeVisible();
  await expect(page.locator("select[aria-label='Session plan']").first()).toHaveValue(/.+/);
  await expect(page.getByText("NOVEMBER 2026", { exact: false })).toBeVisible();
});

test("create a drill with the diagram editor and animate it", async ({ page }) => {
  await login(page);
  await page.goto("/drills/new");
  await page.getByRole("button", { name: "Add attacker" }).click();
  await page.getByRole("button", { name: "Add defender" }).click();
  await page.getByPlaceholder(/Set-up: describe/).fill("Attacker faces a defender");
  await page.getByRole("button", { name: "Step", exact: true }).click();
  await page.getByPlaceholder("What happens in this step?").fill("Attacker steps past");
  // drag the attacker to a new spot in step 1
  const svg = page.locator("svg[role=img]").first();
  const box = (await svg.boundingBox())!;
  const attacker = svg.locator("g[style*='grab']").first();
  const ab = (await attacker.boundingBox())!;
  await page.mouse.move(ab.x + ab.width / 2, ab.y + ab.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.85, box.y + box.height * 0.3, { steps: 8 });
  await page.mouse.up();
  await page.getByRole("button", { name: "Auto arrows from movement" }).click();
  await expect(svg.locator("path[marker-end]")).toHaveCount(1);

  await page.getByLabel("Title").fill("E2E Side Step");
  await page.getByLabel("One-line summary").fill("Beat a defender with a side step");
  await page.getByLabel("Coaching cues").fill("Step late\nAccelerate away");
  await page.getByRole("button", { name: "Save drill" }).click();
  await expect(page).toHaveURL(/\/drills\/e2e-side-step$/);
  await expect(page.getByRole("heading", { name: "E2E Side Step" })).toBeVisible();
  // animated viewer steps through
  await page.getByRole("button", { name: "Next step" }).click();
  await expect(page.getByText("Attacker steps past")).toBeVisible();
  await expect(page.getByText("Step 1 of 1")).toBeVisible();

  // add a video link
  await page.getByPlaceholder("https://youtu.be/…").fill("https://youtu.be/dQw4w9WgXcQ");
  await page.getByPlaceholder("Caption (optional)").fill("Demo");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.locator("iframe[src*='youtube-nocookie.com/embed/dQw4w9WgXcQ']")).toBeVisible();
});

test("build a plan from the library and assign it to a week", async ({ page }) => {
  await login(page);
  await page.goto("/sessions");
  await page.getByRole("button", { name: "New plan" }).click();
  await expect(page).toHaveURL(/\/sessions\/.+\/edit$/);
  await page.getByLabel("Title").fill("E2E Evasion Session");
  await page.getByRole("button", { name: "Add drill from library" }).click();
  await page.getByPlaceholder("Search drills…").fill("E2E Side");
  await page.getByRole("button", { name: /E2E Side Step/ }).click();
  await expect(page.getByText("Drill: E2E Side Step (change)")).toBeVisible();
  await page.getByRole("button", { name: "Save plan" }).click();
  await expect(page).toHaveURL(/\/sessions\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: "E2E Evasion Session" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "E2E Side Step" })).toBeVisible();

  await page.goto("/season?age=U6");
  const firstWeek = page.locator("select[aria-label='Session plan']").first();
  await firstWeek.selectOption({ label: "E2E Evasion Session" });
  await expect
    .poll(async () => {
      await page.waitForLoadState("networkidle");
      await page.reload();
      return page.locator("select[aria-label='Session plan']").first().locator("option:checked").textContent();
    })
    .toBe("E2E Evasion Session");
});

test("cancel a week shifts the sequence forward", async ({ page }) => {
  await login(page);
  await page.goto("/season?age=U6");
  const rows = page.locator("select[aria-label='Session plan']");
  const secondBefore = await rows.nth(1).locator("option:checked").textContent();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Week actions" }).nth(1).click();
  await page.getByText("Cancel & shift sequence").click();
  await expect(page.getByText("1 cancelled")).toBeVisible();
  // the plan from week 2 is now on week 3 (the 2nd remaining plan select)
  await expect(rows.nth(1).locator("option:checked")).toHaveText(secondBefore!);
});

test("register, coach availability, awards and certificate", async ({ page }) => {
  await login(page);
  const id = await addPlayer(page, "Ada", "Lovelace", false);
  await addPlayer(page, "Ben", "Stokes", true);

  // register for the next U6 session
  await page.goto("/register");
  await page.getByText("Upcoming").first().click();
  await expect(page.getByText("/ 2 here")).toBeVisible();
  await page.getByRole("button", { name: /Ada/ }).first().click();
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "All present" }).click();
  await page.waitForLoadState("networkidle");
  // the counter is optimistic; confirm it persisted server-side
  await expect
    .poll(async () => {
      await page.reload();
      return page.locator(".text-3xl").first().textContent();
    })
    .toBe("2");

  // coach availability
  await page.goto("/coaches?age=U6");
  const myCell = page.locator("tr", { hasText: "(you)" }).getByRole("button").first();
  await myCell.click();
  await expect(myCell).toHaveClass(/bg-emerald-500/);
  await expect
    .poll(async () => {
      await page.waitForLoadState("networkidle");
      await page.reload();
      return page.locator("tr", { hasText: "(you)" }).getByRole("button").first().getAttribute("class");
    })
    .toContain("bg-emerald-500");

  // award + certificate
  await page.goto(`/awards?player=${id}`);
  await page.getByLabel("Why? (appears on the certificate)").fill("Brilliant first session");
  await page.getByRole("button", { name: "Award", exact: true }).click();
  await expect(page.getByText("Awarded to Ada!")).toBeVisible();
  const href = await page.getByRole("link", { name: "certificate", exact: true }).getAttribute("href");
  const pdf = await page.request.get(href!);
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()["content-type"]).toBe("application/pdf");
  expect((await pdf.body()).subarray(0, 4).toString()).toBe("%PDF");
});

test("photo upload is blocked without consent and works with it", async ({ page }, testInfo) => {
  await login(page);
  await page.goto("/players?age=U6");
  await page.getByText("Ada Lovelace").click();
  await expect(page.getByText("Photo upload is locked until photo consent is recorded")).toBeVisible();

  await page.goto("/players?age=U6");
  await page.getByText("Ben Stokes").click();
  const file = path.join(testInfo.outputDir, "ben.png");
  await import("node:fs/promises").then((fs) => fs.mkdir(testInfo.outputDir, { recursive: true }).then(() => fs.writeFile(file, PNG)));
  await page.locator("input[name=photo]").setInputFiles(file);
  await page.getByRole("button", { name: "Upload" }).click();
  const img = page.locator(`img[alt="Ben Stokes"]`).first();
  await expect(img).toBeVisible();
  const src = await img.getAttribute("src");
  expect((await page.request.get(src!)).status()).toBe(200);

  // withdraw consent: photo deleted and no longer served
  await page.getByText("Photo consent given").click();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Saved")).toBeVisible();
  expect((await page.request.get(src!)).status()).toBe(404);
});

test("parents only see their own child; coaches only their age group", async ({ page }) => {
  await login(page);
  // parent invite + link to Ben
  const parentPath = await invite(page, "Pat Parent", "pat@example.com", "parent");
  const coachPath = await invite(page, "Casey Coach", "casey@example.com", "coach");
  await page.goto("/players?age=U6");
  await page.getByText("Ben Stokes").click();
  await page.waitForURL(/\/players\/[0-9a-f-]{36}$/);
  const benUrl = page.url();
  await page.getByPlaceholder("parent@email").fill("pat@example.com");
  // account doesn't exist until invite accepted
  await page.getByRole("button", { name: "Link", exact: true }).click();
  await expect(page.getByText("No account with that email")).toBeVisible();
  await page.goto("/players?age=U6");
  await page.getByText("Ada Lovelace").click();
  await page.waitForURL(/\/players\/[0-9a-f-]{36}$/);
  const adaUrl = page.url();

  await acceptInvite(page, parentPath, "parentpassword1");
  await expect(page).toHaveURL(/\/parent$/);
  await expect(page.getByText("No child linked yet")).toBeVisible();

  await login(page);
  await page.goto(benUrl);
  await page.getByPlaceholder("parent@email").fill("pat@example.com");
  await page.getByRole("button", { name: "Link", exact: true }).click();
  await expect(page.getByText("Pat Parent linked")).toBeVisible();

  await logout(page);
  await login(page, "pat@example.com", "parentpassword1");
  await expect(page).toHaveURL(/\/parent$/);
  await expect(page.getByRole("heading", { name: "Ben" })).toBeVisible();
  await expect(page.getByText("Ada")).toHaveCount(0);
  // staff pages bounce parents back to their view
  await page.goto(adaUrl);
  await expect(page).toHaveURL(/\/parent$/);
  await page.goto("/drills");
  await expect(page).toHaveURL(/\/parent$/);

  // coach with no age group sees no players; after assignment sees U6
  await acceptInvite(page, coachPath, "coachpassword1");
  await page.goto("/players");
  await expect(page.getByText("You're not assigned to an age group yet")).toBeVisible();
  await page.goto(adaUrl);
  await expect(page.getByText("Knock-on!")).toBeVisible();

  await logout(page);
  await login(page);
  await assignCoach(page, "Casey Coach", "U6");
  await logout(page);
  await login(page, "casey@example.com", "coachpassword1");
  await page.goto("/players");
  await expect(page.getByText("Ada Lovelace")).toBeVisible();
});

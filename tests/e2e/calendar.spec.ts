import { expect, request, test, type Page } from "@playwright/test";
import { acceptInvite, assignCoach, invite, login } from "./helpers";

test.describe.configure({ mode: "serial" });

/** Unfold ICS continuation lines so values can be matched whole. */
const unfold = (ics: string) => ics.replace(/\r\n /g, "");

async function feedUrlFor(page: Page) {
  await page.goto("/coaches#calendar");
  const setup = page.getByRole("button", { name: "Set up calendar sync" });
  if (await setup.count()) await setup.click();
  const code = page.getByTestId("calendar-feed-url");
  await expect(code).toContainText("/cal/");
  return (await code.textContent())!.trim();
}

async function fetchFeed(url: string) {
  const anon = await request.newContext(); // no session cookie: the token is the credential
  const res = await anon.get(url);
  const body = await res.text();
  await anon.dispose();
  return { status: res.status(), type: res.headers()["content-type"], body: unfold(body) };
}

let feedUrl = "";

test("coach gets a personal ICS feed with every U6 session", async ({ page }) => {
  await login(page);
  feedUrl = await feedUrlFor(page);
  expect(feedUrl).toMatch(/\/cal\/[\w-]{20,}\.ics$/);
  const feed = await fetchFeed(feedUrl);
  expect(feed.status).toBe(200);
  expect(feed.type).toContain("text/calendar");
  expect(feed.body.match(/BEGIN:VEVENT/g)).toHaveLength(23);
  expect(feed.body).toContain("SUMMARY:❓ Reply? U6 training");
  expect(feed.body).toContain("DTSTART;TZID=Europe/London:20261129T093000");
});

test("tapping a link in the calendar event updates availability without signing in", async ({ page, browser }) => {
  const feed = await fetchFeed(feedUrl);
  // second session's "I can make it" link
  const links = [...feed.body.matchAll(/I can make it: (https?:\/\/[^\s\\]+)/g)].map((m) => m[1]);
  expect(links.length).toBeGreaterThan(1);
  const anon = await browser.newContext();
  const p = await anon.newPage();
  await p.goto(links[1]);
  await expect(p.getByRole("heading", { name: "Can you make it?" })).toBeVisible();
  await expect(p.getByText("Sunday 6 December")).toBeVisible();
  await expect(p.getByText("Tap to confirm")).toBeVisible(); // opening the link alone never saves
  await p.getByRole("button", { name: /I can make it/ }).click();
  await expect(p.getByRole("status")).toContainText("Saved");
  await anon.close();

  const after = await fetchFeed(feedUrl);
  expect(after.body).toMatch(/DTSTART;TZID=Europe\/London:20261206T093000\r\nDTEND[^\r]*\r\nSUMMARY:✅ U6 training/);

  await login(page);
  await page.goto("/coaches?age=U6");
  const mine = page.locator("tr", { hasText: "(you)" }).getByRole("button");
  await expect(mine.nth(1)).toHaveClass(/bg-emerald-500/);
});

test("resetting the link kills the old feed", async ({ page }) => {
  await login(page);
  await page.goto("/coaches#calendar");
  await page.getByRole("button", { name: "Reset link" }).click();
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(page.getByTestId("calendar-feed-url")).not.toHaveText(feedUrl);
  const fresh = (await page.getByTestId("calendar-feed-url").textContent())!.trim();
  expect((await fetchFeed(feedUrl)).status).toBe(404);
  expect((await fetchFeed(fresh)).status).toBe(200);
  feedUrl = fresh;
});

test("a coach's feed only covers the age groups they coach", async ({ page }) => {
  await login(page);
  const path = await invite(page, "Fern Feed", "fern@example.com", "coach");
  await acceptInvite(page, path, "fernpassword1");
  const fernUrl = await feedUrlFor(page);
  expect((await fetchFeed(fernUrl)).body.match(/BEGIN:VEVENT/g)).toBeNull();

  await login(page);
  await assignCoach(page, "Fern Feed", "U6");
  expect((await fetchFeed(fernUrl)).body.match(/BEGIN:VEVENT/g)).toHaveLength(23);
});

test("season row: date and View plan open the session; inline availability persists", async ({ page }) => {
  await login(page);
  await page.goto("/season?age=U6");
  await page.getByRole("link", { name: /View session for Sun 29 Nov/ }).click();
  await expect(page).toHaveURL(/\/sessions\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: /Session 1: Baseline and ball confidence/ })).toBeVisible();

  await page.goto("/season?age=U6");
  await page.getByRole("link", { name: "View plan" }).nth(1).click();
  await expect(page.getByRole("heading", { name: /Session 2:/ })).toBeVisible();

  await page.goto("/season?age=U6");
  const third = page.getByRole("group", { name: "My availability" }).nth(2);
  await third.getByRole("button", { name: "Maybe" }).click();
  await expect
    .poll(async () => {
      await page.waitForLoadState("networkidle");
      await page.reload();
      return page.getByRole("group", { name: "My availability" }).nth(2).getByRole("button", { name: "Maybe" }).getAttribute("class");
    })
    .toContain("bg-amber-400");
});

test("month calendars on the dashboard, Season and Plans pages", async ({ page }) => {
  await login(page);
  await page.goto("/");
  const grid = page.getByRole("grid", { name: "November 2026" });
  await expect(grid).toBeVisible();
  await grid.getByRole("button", { name: /^Sun 29 Nov: U6 training/ }).click();
  await expect(page).toHaveURL(/\/sessions\/[0-9a-f-]{36}$/);

  await page.goto("/season?age=U6&view=calendar");
  await expect(page.getByRole("tab", { name: /Calendar/ })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("button", { name: "Next month" }).click();
  await expect(page.getByRole("grid", { name: "December 2026" })).toBeVisible();
  await expect(page.getByRole("grid", { name: "December 2026" }).getByRole("button", { name: /^Sun 6 Dec: U6 training.*you're in/ })).toBeVisible();

  await page.goto("/sessions?view=calendar");
  await expect(page.getByRole("grid", { name: "November 2026" })).toBeVisible();
  await page.getByRole("button", { name: "Next month" }).click();
  await expect(page.getByRole("grid", { name: "December 2026" }).getByText(/U6 · Two-hand carry/)).toBeVisible();
});

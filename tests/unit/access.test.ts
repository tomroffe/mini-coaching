import { describe, expect, it } from "vitest";
import { canManageAgeGroup, canManagePlayer, canSeePhoto, canDeleteUser, canSetConsent, canUnenrol, canUploadPhoto, canViewPlayer, type AccessContext } from "@/lib/access";

const U6 = "g-u6", U7 = "g-u7";
const kidA = { id: "p-a", ageGroupId: U6, photoConsent: true };
const kidB = { id: "p-b", ageGroupId: U7, photoConsent: true };
const noConsent = { id: "p-c", ageGroupId: U6, photoConsent: false };

const admin: AccessContext = { role: "admin", ageGroupIds: [], childIds: [] };
const u6coach: AccessContext = { role: "coach", ageGroupIds: [U6], childIds: [] };
const parentOfA: AccessContext = { role: "parent", ageGroupIds: [], childIds: ["p-a"] };

describe("player visibility", () => {
  it("admin sees everyone", () => {
    expect(canViewPlayer(admin, kidA)).toBe(true);
    expect(canViewPlayer(admin, kidB)).toBe(true);
  });
  it("coach is limited to assigned age groups", () => {
    expect(canViewPlayer(u6coach, kidA)).toBe(true);
    expect(canViewPlayer(u6coach, kidB)).toBe(false);
    expect(canManageAgeGroup(u6coach, U7)).toBe(false);
  });
  it("parent can only see their own child", () => {
    expect(canViewPlayer(parentOfA, kidA)).toBe(true);
    expect(canViewPlayer(parentOfA, kidB)).toBe(false);
  });
  it("parent can never manage players", () => {
    expect(canManagePlayer(parentOfA, kidA)).toBe(false);
  });
  it("a coach with no assignment cannot see unassigned players", () => {
    expect(canViewPlayer({ role: "coach", ageGroupIds: [], childIds: [] }, { id: "x", ageGroupId: null })).toBe(false);
  });
});

describe("photo consent", () => {
  it("blocks upload without consent, even for admins", () => {
    expect(canUploadPhoto(admin, noConsent)).toBe(false);
    expect(canUploadPhoto(u6coach, noConsent)).toBe(false);
  });
  it("allows upload with consent for the right coach only", () => {
    expect(canUploadPhoto(u6coach, kidA)).toBe(true);
    expect(canUploadPhoto(u6coach, kidB)).toBe(false);
  });
  it("hides photos when consent is withdrawn", () => {
    expect(canSeePhoto(admin, noConsent)).toBe(false);
    expect(canSeePhoto(parentOfA, kidA)).toBe(true);
  });
});

describe("photo consent changes", () => {
  it("a parent can change consent for their own child only", () => {
    expect(canSetConsent(parentOfA, kidA)).toBe(true);
    expect(canSetConsent(parentOfA, kidB)).toBe(false);
  });
  it("coaches only for their age group; admins always", () => {
    expect(canSetConsent(u6coach, kidA)).toBe(true);
    expect(canSetConsent(u6coach, kidB)).toBe(false);
    expect(canSetConsent(admin, kidB)).toBe(true);
  });
});

describe("unenrolling", () => {
  it("only the child's own parent (or an admin) can unenrol", () => {
    expect(canUnenrol(parentOfA, kidA)).toBe(true);
    expect(canUnenrol(parentOfA, kidB)).toBe(false);
    expect(canUnenrol(u6coach, kidA)).toBe(false);
    expect(canUnenrol(admin, kidB)).toBe(true);
  });
});

describe("deleting users", () => {
  const me = "u-me";
  it("never deletes yourself", () => {
    expect(canDeleteUser(me, { id: me, role: "admin", active: true }, 3).ok).toBe(false);
  });
  it("protects the last active admin", () => {
    expect(canDeleteUser(me, { id: "u2", role: "admin", active: true }, 1).ok).toBe(false);
    expect(canDeleteUser(me, { id: "u2", role: "admin", active: true }, 2).ok).toBe(true);
    expect(canDeleteUser(me, { id: "u2", role: "admin", active: false }, 1).ok).toBe(true);
  });
  it("allows deleting coaches and parents", () => {
    expect(canDeleteUser(me, { id: "c", role: "coach", active: true }, 1).ok).toBe(true);
    expect(canDeleteUser(me, { id: "p", role: "parent", active: false }, 1).ok).toBe(true);
  });
});

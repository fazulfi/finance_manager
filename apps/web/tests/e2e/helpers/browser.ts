import { randomUUID } from "node:crypto";

import { db } from "@finance/db";
import { expect, type Page } from "@playwright/test";
import bcrypt from "bcryptjs";

const TEST_CATEGORIES = [
  { name: "Food & Dining", icon: "🍽️", color: "#dc2626" },
  { name: "Housing", icon: "🏠", color: "#ef4444" },
  { name: "Transport", icon: "🚗", color: "#f97316" },
] as const;

const RUN_ID = randomUUID().slice(0, 8);

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "e2e"
  );
}

export function createTestUser(specName: string) {
  const slug = slugify(specName);

  return {
    name: `${slug} user`,
    email: `${slug}.${RUN_ID}@example.com`,
    password: `E2E-${RUN_ID}-${slug}!1`,
  };
}

export async function signupUser(page: Page, user: ReturnType<typeof createTestUser>) {
  await page.goto("/signup");
  await page.getByLabel("Full name").fill(user.name);
  await page.getByLabel("Email address").fill(user.email);
  await page.getByLabel("Password").fill(user.password);

  const registerResponse = await page.request.post("/api/register", {
    data: {
      name: user.name,
      email: user.email,
      password: user.password,
    },
  });

  if (registerResponse.status() !== 201 && registerResponse.status() !== 409) {
    const body = await registerResponse.text();
    throw new Error(`Failed to create test user (${registerResponse.status()}): ${body}`);
  }

  const existing = await db.user.findUnique({
    where: { email: user.email },
    select: { id: true },
  });

  const userId =
    existing?.id ??
    (
      await db.user.create({
        data: {
          email: user.email,
          name: user.name,
          password: await bcrypt.hash(user.password, 12),
        },
        select: { id: true },
      })
    ).id;

  for (const category of TEST_CATEGORIES) {
    const current = await db.category.findFirst({
      where: { userId, name: category.name },
      select: { id: true },
    });

    if (!current) {
      await db.category.create({
        data: {
          userId,
          name: category.name,
          type: "EXPENSE",
          icon: category.icon,
          color: category.color,
          isDefault: true,
          usageCount: 0,
        },
      });
    }
  }
}

export async function loginUser(page: Page, user: ReturnType<typeof createTestUser>) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard(?:\/)?(?:\?.*)?$/, { timeout: 15000 });
}

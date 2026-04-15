// apps/web/app/api/register/route.ts
// Public registration endpoint — creates a new user with a bcrypt-hashed password.
// Returns 409 on duplicate email. Password is NEVER returned in the response (select strips it).
import { seedDefaultCategories } from "@finance/api";
import { db } from "@finance/db";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1).max(100).optional(),
});

function isDuplicateEmailError(error: unknown): boolean {
  if (error instanceof Error && error.message === "Duplicate email") {
    return true;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  ) {
    return true;
  }

  if (error instanceof Error && /duplicate|unique constraint/i.test(error.message)) {
    return true;
  }

  return false;
}

function isDatabaseConnectionError(error: unknown): boolean {
  if (typeof error === "object" && error !== null && "name" in error) {
    const name = String((error as { name?: unknown }).name ?? "");
    if (name === "PrismaClientInitializationError") {
      return true;
    }
  }

  if (!(error instanceof Error)) {
    return false;
  }

  return /database_url|can't reach database server|server selection timeout|econnrefused|connection|mongodb/i.test(
    error.message,
  );
}

function hasInvalidDatabaseUrlConfig(): boolean {
  const databaseUrl = process.env["DATABASE_URL"];

  if (!databaseUrl) {
    return true;
  }

  return /username:password/i.test(databaseUrl);
}

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const body: unknown = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { email, password, name } = parsed.data;

    if (hasInvalidDatabaseUrlConfig()) {
      return NextResponse.json(
        {
          error:
            "Database is not configured for web runtime. Set a real DATABASE_URL in apps/web/.env.local and restart dev server.",
        },
        { status: 503 },
      );
    }

    const existing = await db.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await db.user.create({
      data: {
        email,
        password: hashedPassword,
        ...(name != null ? { name } : {}),
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    try {
      await seedDefaultCategories(db, user.id);
    } catch (seedError) {
      console.error("Failed to seed default categories", seedError);
    }

    return NextResponse.json(user, { status: 201 });
  } catch (error: unknown) {
    if (isDuplicateEmailError(error)) {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }

    if (isDatabaseConnectionError(error)) {
      const detail =
        process.env["NODE_ENV"] !== "production" && error instanceof Error
          ? error.message
          : undefined;

      return NextResponse.json(
        {
          error: "Database connection failed. Check DATABASE_URL and MongoDB availability.",
          ...(detail ? { detail } : {}),
        },
        { status: 503 },
      );
    }

    console.error("Register API failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

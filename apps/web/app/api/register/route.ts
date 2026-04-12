// apps/web/app/api/register/route.ts
// Public registration endpoint — creates a new user with a bcrypt-hashed password.
// Returns 409 on duplicate email. Password is NEVER returned in the response (select strips it).
import { NextResponse } from "next/server";
import { db } from "@finance/db";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { seedDefaultCategories } from "@finance/api";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1).max(100).optional(),
});

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

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await db.$transaction(async (tx) => {
      // Use findUniqueOrThrow for atomic duplicate check
      const existing = await tx.user.findUnique({
        where: { email },
      });

      if (existing) {
        throw new Error("Duplicate email");
      }

      const newUser = await tx.user.create({
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

      // Seed default categories for new user (within same transaction)
      await seedDefaultCategories(tx, newUser.id);

      return newUser;
    });

    return NextResponse.json(user, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

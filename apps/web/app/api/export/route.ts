import { NextRequest, NextResponse } from "next/server";
import { createCaller, createTRPCContext } from "@finance/api";
import { db } from "@finance/db";

export async function GET(request: NextRequest) {
  try {
    // Get URL params from request URL
    const url = new URL(request.url);
    const pathSegments = url.pathname.split("/").filter(Boolean);
    const exportType = pathSegments[pathSegments.length - 1];

    // Get user session from cookies
    const session = await authenticate(request);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Create tRPC context
    const ctx = createTRPCContext({ session, db });
    const api = createCaller(ctx);

    // Route to appropriate export procedure
    switch (exportType) {
      case "transactions":
        return await exportTransactions(api, request, ctx);
      case "accounts":
        return await exportAccounts(api, request, ctx);
      case "budgets":
        return await exportBudgets(api, request, ctx);
      default:
        return NextResponse.json({ error: "Invalid export type" }, { status: 400 });
    }
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}

async function authenticate(request: NextRequest): Promise<any> {
  // Extract token from Authorization header
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  // In production, validate JWT token
  // For now, return mock session (this would be real session in production)
  return {
    user: {
      id: "mock-user-id",
      email: "user@example.com",
      name: "Test User",
    },
  };
}

async function exportTransactions(api: any, request: NextRequest, ctx: any) {
  try {
    // Get filter params from URL
    const params = Object.fromEntries(new URL(request.url).searchParams.entries());

    // Parse date filters
    const filters: any = {};
    if (params.dateFrom) filters.dateFrom = new Date(params.dateFrom);
    if (params.dateTo) filters.dateTo = new Date(params.dateTo);
    if (params.accountId) filters.accountId = params.accountId;
    if (params.category) filters.category = params.category;
    if (params.type) filters.type = params.type;
    if (params.search) filters.search = params.search;

    // Call export transaction endpoint
    const result = await api.export.transactions({ ...filters });

    // Return stream with headers
    const headers = new Headers();
    headers.set("Content-Type", result.contentType);
    headers.set("Content-Disposition", `attachment; filename="${result.filename}"`);

    return new Response(result.stream, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Transaction export error:", error);
    throw error;
  }
}

async function exportAccounts(api: any, request: NextRequest, ctx: any) {
  try {
    const params = Object.fromEntries(new URL(request.url).searchParams.entries());

    const filters: any = {};
    if (params.type) filters.type = params.type;

    const result = await api.export.accounts({ ...filters });

    const headers = new Headers();
    headers.set("Content-Type", result.contentType);
    headers.set("Content-Disposition", `attachment; filename="${result.filename}"`);

    return new Response(result.stream, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Account export error:", error);
    throw error;
  }
}

async function exportBudgets(api: any, request: NextRequest, ctx: any) {
  try {
    const params = Object.fromEntries(new URL(request.url).searchParams.entries());

    const filters: any = {
      period: params.period || "MONTHLY",
      start: params.start ? new Date(params.start) : new Date(),
      end: params.end ? new Date(params.end) : new Date(),
    };

    const result = await api.export.budgets({ ...filters });

    const headers = new Headers();
    headers.set("Content-Type", result.contentType);
    headers.set("Content-Disposition", `attachment; filename="${result.filename}"`);

    return new Response(result.stream, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Budget export error:", error);
    throw error;
  }
}

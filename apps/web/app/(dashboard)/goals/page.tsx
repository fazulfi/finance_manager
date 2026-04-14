import { createTRPCContext, goalRouter } from "@finance/api";
import { db } from "@finance/db";
import type { Metadata } from "next";

import { auth } from "@/auth";
import { GoalsOverview } from "@/components/goals/GoalsOverview";

export const metadata: Metadata = {
  title: "Goals",
  description: "Track savings goals, contributions, and milestones",
};

export default async function GoalsPage(): Promise<React.JSX.Element> {
  const session = await auth();
  if (!session?.user) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Goals</h1>
          <p className="text-sm text-muted-foreground">
            Set savings goals and track your progress toward financial milestones.
          </p>
        </div>
        <GoalsOverview goals={[]} />
      </div>
    );
  }

  const ctx = createTRPCContext({ session, db });
  const trpc = goalRouter.createCaller(ctx);
  const goals = await trpc.list({ page: 1, limit: 100 });
  const goalsList = goals.items || [];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Goals</h1>
        <p className="text-sm text-muted-foreground">
          Set savings goals and track your progress toward financial milestones.
        </p>
      </div>

      <GoalsOverview goals={goalsList} />
    </div>
  );
}

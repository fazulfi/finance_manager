// apps/web/app/(dashboard)/page.tsx
import { Dashboard } from "@/components/dashboard/Dashboard";

export const metadata = {
  title: "Dashboard",
  description: "Financial overview dashboard",
};

export default function DashboardPage() {
  return <Dashboard />;
}

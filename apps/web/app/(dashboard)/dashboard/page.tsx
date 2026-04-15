import dynamic from "next/dynamic";

const Dashboard = dynamic(
  () => import("@/components/dashboard/Dashboard").then((mod) => mod.Dashboard),
  {
    ssr: false,
  },
);

export const metadata = {
  title: "Dashboard",
  description: "Financial overview dashboard",
};

export default function DashboardRoutePage() {
  return <Dashboard />;
}

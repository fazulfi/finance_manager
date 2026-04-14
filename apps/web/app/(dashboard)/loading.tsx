import { Skeleton } from "@finance/ui";

export default function DashboardLoading(): React.JSX.Element {
  return (
    <div className="space-y-5">
      <Skeleton className="h-8 w-56" />
      <div className="grid gap-4 md:grid-cols-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="h-80" />
      <Skeleton className="h-80" />
    </div>
  );
}

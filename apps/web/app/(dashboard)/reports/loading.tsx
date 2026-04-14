import { Skeleton } from "@finance/ui";

export default function ReportsLoading(): React.JSX.Element {
  return (
    <div className="space-y-5">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-56 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

import { Skeleton } from "@finance/ui";

export default function TransactionsLoading(): React.JSX.Element {
  return (
    <div className="space-y-5">
      <Skeleton className="h-8 w-44" />
      <Skeleton className="h-32 w-full" />
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    </div>
  );
}

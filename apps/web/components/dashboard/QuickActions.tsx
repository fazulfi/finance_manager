// apps/web/components/dashboard/QuickActions.tsx
"use client";

import { Plus, ArrowLeftRight, PieChart, FolderOpen } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@finance/ui";

interface QuickAction {
  label: string;
  icon: React.ReactNode;
  route: string;
  description?: string;
}

export function QuickActions() {
  const router = useRouter();

  const quickActions: QuickAction[] = [
    {
      label: "Add Transaction",
      icon: <Plus className="h-4 w-4" />,
      route: "/transactions/new",
      description: "Record income or expense",
    },
    {
      label: "Transfer",
      icon: <ArrowLeftRight className="h-4 w-4" />,
      route: "/accounts/transfer",
      description: "Move money between accounts",
    },
    {
      label: "View Budgets",
      icon: <PieChart className="h-4 w-4" />,
      route: "/budget",
      description: "Check budget progress",
    },
    {
      label: "View Projects",
      icon: <FolderOpen className="h-4 w-4" />,
      route: "/projects",
      description: "Track project expenses",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {quickActions.map((action) => (
        <Button
          key={action.label}
          variant="outline"
          size="lg"
          onClick={() => router.push(action.route)}
          className="group flex flex-col items-start justify-start gap-2 h-auto p-4 text-left"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
            {action.icon}
          </div>
          <div className="flex-1">
            <span className="font-semibold text-foreground">{action.label}</span>
            {action.description && (
              <p className="text-xs text-muted-foreground mt-1">{action.description}</p>
            )}
          </div>
          <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </Button>
      ))}
    </div>
  );
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

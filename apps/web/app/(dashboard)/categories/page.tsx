"use client";

// apps/web/app/(dashboard)/categories/page.tsx
import { buttonVariants } from "@finance/ui";
import { Plus } from "lucide-react";
import Link from "next/link";

import { CategoryManager } from "@/components/categories/CategoryManager";

export default function CategoriesPage(): React.JSX.Element {
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Categories</h1>
          <p className="text-sm text-muted-foreground">Manage your expense categories.</p>
        </div>
        <Link href="#create" className={buttonVariants({ className: "gap-2" })}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Create category
        </Link>
      </div>

      <CategoryManager
        categories={[]}
        onCreate={() => {
          // This callback is required by CategoryManager interface
          // but CategoryManager handles creation internally via tRPC mutation
        }}
        onEdit={(category: any) => {
          // This callback is required by CategoryManager interface
          // but CategoryManager handles editing internally via tRPC mutation
        }}
        onDelete={(category: any) => {
          // This callback is required by CategoryManager interface
          // but CategoryManager handles deletion internally via tRPC mutation
        }}
      />
    </div>
  );
}

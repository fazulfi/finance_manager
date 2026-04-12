"use client";

import { api } from "@finance/api/react";
import {
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Skeleton,
  buttonVariants,
} from "@finance/ui";
import { AlertTriangle, Trash2 } from "lucide-react";
import { useState } from "react";
import { CategoryForm } from "./CategoryForm";
import { type Category, CategoryType } from "@finance/types";

interface CategoryManagerProps {
  categories: Category[]; // With usageCount field
  onCreate: () => void;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
}

function CategoryCard({
  category,
  onEdit,
  onDelete,
}: {
  category: Category & { usageCount?: number };
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
}): React.JSX.Element {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const deleteMutation = api.category.delete.useMutation({
    onSuccess: () => {
      setIsDeleteDialogOpen(false);
      onDelete(category);
    },
    onError: (error) => {
      // Error is handled by tRPC, but we could add toast here if needed
      console.error("Delete error:", error);
    },
  });

  const isDeleting = deleteMutation.isLoading;
  const isDefault = category.isDefault;

  return (
    <>
      <Card className="group hover:border-blue-500/50 transition-colors">
        <CardContent className="space-y-4 p-4">
          {/* Card Header: Icon, Name, Color */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full text-2xl"
                style={{ backgroundColor: category.color || "#e2e8f0" }}
              >
                {category.icon || "📁"}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 truncate">{category.name}</h3>
                <p className="text-xs text-muted-foreground capitalize">{category.type}</p>
              </div>
            </div>

            {/* Type Badge */}
            <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset">
              <span
                className={`h-1.5 w-1.5 rounded-full mr-1.5 ${
                  category.type === CategoryType.INCOME ? "bg-emerald-500" : "bg-rose-500"
                }`}
              />
              {category.type === CategoryType.INCOME ? "Income" : "Expense"}
            </span>
          </div>

          {/* Usage Count */}
          <div className="flex items-center justify-between rounded-lg border bg-gray-50 p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Trash2 className="h-4 w-4" />
              <span>
                {category.usageCount ?? 0} transaction{category.usageCount === 1 ? "" : "s"}
              </span>
            </div>
            {category.usageCount === 0 && (
              <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                New
              </span>
            )}
          </div>

          {/* Delete Button */}
          <Button
            variant="ghost"
            size="sm"
            className="w-full gap-2 text-destructive hover:bg-destructive/10"
            onClick={() => setIsDeleteDialogOpen(true)}
            disabled={isDeleting || isDefault}
          >
            <Trash2 className="h-4 w-4" />
            Delete category
          </Button>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      {isDeleteDialogOpen && (
        <Dialog open onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Delete category</DialogTitle>
            </DialogHeader>

            {isDefault ? (
              <>
                <div className="space-y-2">
                  <div className="flex gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
                    <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
                    <div className="space-y-1">
                      <h4 className="font-medium text-destructive">
                        Cannot delete default category
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Default categories are required for the app to function correctly and cannot
                        be deleted.
                      </p>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                    Cancel
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-600">
                  Are you sure you want to delete <strong>{category.name}</strong>? This action
                  cannot be undone.
                </p>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsDeleteDialogOpen(false)}
                    disabled={isDeleting}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => deleteMutation.mutate({ id: category.id })}
                    disabled={isDeleting}
                  >
                    {isDeleting && (
                      <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    )}
                    Delete
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

function CategoryCardSkeleton(): React.JSX.Element {
  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-9 w-full" />
      </CardContent>
    </Card>
  );
}

export function CategoryManager({
  categories,
  onCreate,
  onEdit,
  onDelete,
}: CategoryManagerProps): React.JSX.Element {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | undefined>(undefined);

  return (
    <div className="space-y-4">
      {/* Create Button */}
      <Button onClick={() => setIsCreateDialogOpen(true)} className="w-full sm:w-auto">
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white text-primary">
          <Plus />
        </span>
        Create category
      </Button>

      {/* Category List */}
      {categories.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <h2 className="text-lg font-semibold">No categories yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Create your first category to organize your transactions.
          </p>
          <Button onClick={() => setIsCreateDialogOpen(true)} className="mt-4">
            Create category
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {categories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}

      {/* Create Dialog */}
      {isCreateDialogOpen && (
        <Dialog open onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create category</DialogTitle>
            </DialogHeader>
            <CategoryForm
              mode="create"
              onSubmit={async () => {
                setIsCreateDialogOpen(false);
                onCreate();
              }}
              onCancel={() => setIsCreateDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Dialog */}
      {editingCategory && (
        <Dialog open onOpenChange={() => setEditingCategory(undefined)}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit category</DialogTitle>
            </DialogHeader>
            <CategoryForm
              mode="update"
              category={editingCategory}
              onSubmit={async () => {
                setEditingCategory(undefined);
                onEdit(editingCategory!);
              }}
              onCancel={() => setEditingCategory(undefined)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function Plus() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14"></path>
      <path d="M12 5v14"></path>
    </svg>
  );
}

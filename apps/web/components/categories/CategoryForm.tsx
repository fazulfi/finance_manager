"use client";

import { api } from "@finance/api/react";
import { type Category, CategoryType } from "@finance/types";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
  buttonVariants,
} from "@finance/ui";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { ColorPicker } from "./ColorPicker";
import { IconPicker } from "./IconPicker";


// Category type values are strings for Zod compatibility ("INCOME" | "EXPENSE")
type CategoryTypeValue = "INCOME" | "EXPENSE";

const CATEGORY_TYPE_LABELS: Record<string, string> = {
  INCOME: "Income",
  EXPENSE: "Expense",
};

const categoryFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(50, "Name too long"),
  type: z.enum(["INCOME", "EXPENSE"]),
  icon: z.string().max(50).optional(),
  color: z.string().max(7).optional(),
  parent: z.string().optional(),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema> & {
  type: CategoryTypeValue;
};

interface CategoryFormProps {
  mode?: "create" | "update";
  category?: Category;
  onSubmit: (data: {
    name: string;
    type: CategoryTypeValue;
    icon?: string;
    color?: string;
  }) => Promise<void>;
  onCancel: () => void;
}

export function CategoryForm({
  mode = "create",
  category,
  onSubmit,
  onCancel,
}: CategoryFormProps): React.JSX.Element {
  const router = useRouter();
  const utils = api.useContext();

  const createCategory = api.category.create.useMutation({
    onSuccess: async (created) => {
      toast({ title: "Category created", description: `${created.name} is ready to use.` });
      await utils.category.list.invalidate();
      router.push(`/categories/${created.id}`);
    },
    onError: (error) => {
      toast({
        title: "Failed to create category",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateCategory = api.category.update.useMutation({
    onSuccess: async () => {
      toast({ title: "Category updated", description: "Your changes were saved." });
      if (category) {
        await utils.category.getById.invalidate({ id: category.id });
      }
      await utils.category.list.invalidate();
      router.refresh();
    },
    onError: (error) => {
      toast({
        title: "Failed to update category",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const isSubmitting = createCategory.isLoading || updateCategory.isLoading;
  const submitError = createCategory.error?.message ?? updateCategory.error?.message;

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: category?.name ?? "",
      type: (category?.type as unknown as CategoryTypeValue) ?? CategoryType.EXPENSE,
      icon: category?.icon ?? "",
      color: category?.color ?? "",
      parent: category?.parent ?? "",
    },
  });

  const onSubmitForm = async (values: CategoryFormValues) => {
    try {
      // Type-validated result from mutation
      // Cast to string literal union since mutation returns Prisma enum type
      const result = (
        mode === "update" && category
          ? await updateCategory.mutateAsync({
              id: category.id,
              name: values.name,
              icon: values.icon || undefined,
              color: values.color || undefined,
            })
          : await createCategory.mutateAsync({
              name: values.name,
              type: values.type,
              icon: values.icon || undefined,
              color: values.color || undefined,
              parent: values.parent || undefined,
            })
      ) as {
        name: string;
        type: "INCOME" | "EXPENSE";
        icon?: string;
        color?: string;
        parent?: string;
      };

      // onSubmit expects type field (union "INCOME" | "EXPENSE")
      await onSubmit({
        name: result.name,
        type: result.type,
        icon: values.icon,
        color: values.color,
      } as { name: string; type: CategoryTypeValue; icon?: string; color?: string });
    } catch (error) {
      // Error is already handled by mutation error handler
      console.error("Category form submission error:", error);
    }
  };

  const handleCancel = () => {
    form.reset();
    onCancel();
  };

  // Get parent categories for dropdown (filter by type, exclude self and children)
  const categoryType = form.watch("type");
  const parentId = form.watch("parent");

  const { data: categoryList } = api.category.list.useQuery(
    {
      page: 1,
      limit: 100,
      type: categoryType,
    },
    {
      enabled: mode === "create" && categoryType !== undefined,
    },
  );

  const filteredParentCategories =
    mode === "create" && categoryList?.items
      ? categoryList.items.filter(
          (cat) => cat.type === categoryType && cat.id !== (parentId as string),
        )
      : [];

  return (
    <Dialog open onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Create category" : "Edit category"}</DialogTitle>
        </DialogHeader>

        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmitForm)} noValidate>
          {submitError && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {submitError}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="category-name">Name *</Label>
            <Input
              id="category-name"
              {...form.register("name")}
              disabled={isSubmitting}
              placeholder="Enter category name"
            />
            {form.formState.errors.name && (
              <p className="text-xs font-medium text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Type *</Label>
            <Controller
              control={form.control}
              name="type"
              render={({ field }) => (
                <Select
                  value={field.value as string}
                  onValueChange={(value) => field.onChange(value as CategoryFormValues["type"])}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(CategoryType).map((type) => (
                      <SelectItem key={type} value={type as string}>
                        {CATEGORY_TYPE_LABELS[type as string]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.type && (
              <p className="text-xs font-medium text-destructive">
                {form.formState.errors.type.message}
              </p>
            )}
          </div>

          <IconPicker
            value={form.watch("icon") as string}
            onChange={(value) => form.setValue("icon", value)}
            label="Icon"
          />

          <ColorPicker
            value={form.watch("color") || "none"}
            onChange={(value) => form.setValue("color", value === "none" ? undefined : value)}
            label="Color"
          />

          {mode === "create" && (
            <div className="space-y-1.5">
              <Label htmlFor="category-parent">Parent category (optional)</Label>
              <Select
                value={parentId || ""}
                onValueChange={(value) => form.setValue("parent", value || undefined)}
                disabled={isSubmitting || !categoryList?.items}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select parent category (filter by type)" />
                </SelectTrigger>
                <SelectContent>
                  {filteredParentCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.parent && (
                <p className="text-xs font-medium text-destructive">
                  {form.formState.errors.parent.message}
                </p>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleCancel}
              className={buttonVariants({ variant: "outline" })}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {mode === "create" ? "Create category" : "Save changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

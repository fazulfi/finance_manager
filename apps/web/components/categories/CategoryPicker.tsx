"use client";

import { api } from "@finance/api/react";
import { type Category, CategoryType } from "@finance/types";
import { Input } from "@finance/ui";
import { cn } from "@finance/utils";
import { Search, X } from "lucide-react";
import { useState } from "react";

// Internal simplified category type for filtering (without user relation)
type CategorySummary = {
  id: string;
  userId: string;
  name: string;
  type: CategoryType;
  parent: string | null;
  icon: string | null;
  color: string | null;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
};

interface CategoryPickerProps {
  selectedCategory?: Category | null;
  onCategorySelect: (category: Category | null) => void;
  placeholder?: string;
  className?: string;
}

export function CategoryPicker({
  selectedCategory,
  onCategorySelect,
  placeholder = "Select category...",
  className,
}: CategoryPickerProps): React.JSX.Element {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<CategoryType | "ALL">("ALL");

  // Fetch categories with type filter and limit
  const { data: categoryList, isLoading } = api.category.list.useQuery(
    {
      page: 1,
      limit: 100,
      type: filterType === "ALL" ? undefined : (filterType as unknown as "INCOME" | "EXPENSE"),
    },
    {
      enabled: true, // Always enabled to support filtering
    },
  );

  // Filter categories by search query
  // The category list from API returns Prisma Category model (without user relation)
  // We'll filter and work with the raw category type
  const filteredCategories = categoryList?.items.filter((cat) =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase()),
  ) as CategorySummary[] | undefined;

  const handleTypeChange = (newType: CategoryType | "ALL") => {
    setFilterType(newType);
    setSearchQuery(""); // Reset search when type changes
  };

  const handleClearSelection = () => {
    onCategorySelect(null);
  };

  // Determine display text for placeholder
  const displayText = selectedCategory ? selectedCategory.icon : placeholder;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Type Filter */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Filter by type</label>
        <select
          value={filterType}
          onChange={(e) => handleTypeChange(e.target.value as CategoryType | "ALL")}
          className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1"
        >
          <option value="ALL">All Types</option>
          <option value="INCOME">Income</option>
          <option value="EXPENSE">Expense</option>
        </select>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder={`Search categories...`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          disabled={isLoading}
          className="pl-9"
          aria-label="Search categories"
        />
      </div>

      {/* Category Selector */}
      <select
        value={selectedCategory?.id || ""}
        onChange={(e) => {
          if (e.target.value === "") {
            onCategorySelect(null);
          } else {
            const selected = filteredCategories?.find((cat) => cat.id === e.target.value);
            // Cast to Category | null since we don't have full Category data
            // UI will render as needed by the consumer
            onCategorySelect((selected || null) as Category | null);
          }
        }}
        disabled={isLoading}
        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1"
      >
        <option value="">{displayText}</option>

        {isLoading ? (
          <option disabled>Loading...</option>
        ) : filteredCategories?.length === 0 ? (
          <option disabled>No categories found</option>
        ) : (
          filteredCategories?.map((category) => (
            <option key={category.id} value={category.id}>
              <span className="mr-2">{category.icon}</span>
              {category.name}
            </option>
          ))
        )}
      </select>

      {/* Selected Category Display (with clear button) */}
      {selectedCategory && (
        <div className="flex items-center justify-between rounded-md border border-input bg-background px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">{selectedCategory.icon}</span>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-foreground">{selectedCategory.name}</span>
              <span className="text-xs text-muted-foreground">
                {selectedCategory.type === CategoryType.INCOME ? "Income" : "Expense"}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClearSelection}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Clear selection"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

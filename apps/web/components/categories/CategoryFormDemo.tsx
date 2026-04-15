// Demo: How to use IconPicker and ColorPicker in a CategoryForm
"use client";

import { Button } from "@finance/ui";
import { useState } from "react";

import { IconPicker, ColorPicker } from "../categories";

interface CategoryFormData {
  name: string;
  icon: string;
  color: string;
}

export function CategoryFormDemo(): React.JSX.Element {
  const [formData, setFormData] = useState<CategoryFormData>({
    name: "",
    icon: "🏠",
    color: "none",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted:", formData);
    // Here you would call your API to create/update the category
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
      <div className="space-y-2">
        <label htmlFor="category-name" className="text-sm font-medium text-foreground">
          Category Name
        </label>
        <input
          id="category-name"
          type="text"
          placeholder="e.g., Entertainment"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          required
        />
      </div>

      <IconPicker
        value={formData.icon}
        onChange={(icon) => setFormData({ ...formData, icon })}
        label="Select Icon"
      />

      <ColorPicker
        value={formData.color}
        onChange={(color) => setFormData({ ...formData, color })}
        label="Select Color"
      />

      <Button type="submit" className="w-full">
        Save Category
      </Button>
    </form>
  );
}

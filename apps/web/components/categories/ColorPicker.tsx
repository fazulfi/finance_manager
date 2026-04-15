"use client";

import { cn } from "@finance/utils";
import { type InputHTMLAttributes, useState } from "react";

import { type ColorPickerProps } from "./types";

const COLORS = [
  { value: "none", name: "None", hex: "transparent" },
  { value: "red-500", name: "Red", hex: "#ef4444" },
  { value: "red-600", name: "Red 600", hex: "#dc2626" },
  { value: "rose-500", name: "Rose", hex: "#f43f5e" },
  { value: "pink-500", name: "Pink", hex: "#ec4899" },
  { value: "fuchsia-500", name: "Fuchsia", hex: "#d946ef" },
  { value: "purple-500", name: "Purple", hex: "#a855f7" },
  { value: "violet-500", name: "Violet", hex: "#8b5cf6" },
  { value: "indigo-500", name: "Indigo", hex: "#6366f1" },
  { value: "blue-500", name: "Blue", hex: "#3b82f6" },
  { value: "sky-500", name: "Sky", hex: "#0ea5e9" },
  { value: "cyan-500", name: "Cyan", hex: "#06b6d4" },
  { value: "teal-500", name: "Teal", hex: "#14b8a6" },
  { value: "green-500", name: "Green", hex: "#22c55e" },
  { value: "emerald-500", name: "Emerald", hex: "#10b981" },
  { value: "lime-500", name: "Lime", hex: "#84cc16" },
  { value: "yellow-500", name: "Yellow", hex: "#eab308" },
  { value: "amber-500", name: "Amber", hex: "#f59e0b" },
  { value: "orange-500", name: "Orange", hex: "#f97316" },
  { value: "orange-600", name: "Orange 600", hex: "#ea580c" },
  { value: "stone-500", name: "Stone", hex: "#78716c" },
  { value: "neutral-500", name: "Neutral", hex: "#737373" },
  { value: "slate-500", name: "Slate", hex: "#64748b" },
];

export function ColorPicker({ value, onChange, label }: ColorPickerProps): React.JSX.Element {
  const [selectedColor, setSelectedColor] = useState(value || "none");

  const handleSelect = (colorValue: string) => {
    setSelectedColor(colorValue);
    onChange(colorValue);
  };

  return (
    <div className="space-y-2">
      {label && (
        <label htmlFor="color-picker" className="text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
        {COLORS.map((color) => {
          const isSelected = selectedColor === color.value;
          return (
            <button
              key={color.value}
              type="button"
              onClick={() => handleSelect(color.value)}
              className={cn(
                "flex flex-col items-center gap-2 rounded-lg p-3 text-center transition-all hover:scale-105",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
                isSelected && "scale-110",
              )}
              aria-label={`Select ${color.name} color`}
              aria-pressed={isSelected}
              style={color.hex !== "transparent" ? { backgroundColor: color.hex } : undefined}
            >
              {color.value !== "none"
                ? isSelected && (
                    <div className="flex h-5 w-5 items-center justify-center rounded-sm ring-2 ring-offset-1 ring-background">
                      <div className="h-3 w-3 rounded-full bg-white" style={{ color: color.hex }} />
                    </div>
                  )
                : isSelected && (
                    <div className="flex h-5 w-5 items-center justify-center rounded-sm ring-2 ring-offset-1 ring-background">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-muted-foreground"
                        aria-hidden="true"
                      >
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    </div>
                  )}
              <span className="text-xs text-muted-foreground">{color.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

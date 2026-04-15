"use client";

import { cn } from "@finance/utils";
import { Search } from "lucide-react";
import { type InputHTMLAttributes, useState } from "react";

import type { IconPickerProps } from "./types";

const ICONS: { emoji: string; name: string }[] = [
  // Housing
  { emoji: "🏠", name: "Home" },
  // Food
  { emoji: "🍽️", name: "Food" },
  { emoji: "🍔", name: "Burger" },
  { emoji: "🍕", name: "Pizza" },
  { emoji: "🍜", name: "Noodle" },
  { emoji: "🍲", name: "Stew" },
  { emoji: "🥗", name: "Salad" },
  { emoji: "🥘", name: "Pot" },
  // Transport
  { emoji: "🚗", name: "Car" },
  { emoji: "🚕", name: "Taxi" },
  { emoji: "🚙", name: "SUV" },
  { emoji: "🚌", name: "Bus" },
  { emoji: "🚲", name: "Bike" },
  { emoji: "🚍", name: "Van" },
  { emoji: "🚎", name: "Tram" },
  { emoji: "🏎️", name: "Racer" },
  // Entertainment
  { emoji: "🎮", name: "Game" },
  { emoji: "🎬", name: "Movie" },
  { emoji: "📺", name: "TV" },
  { emoji: "📷", name: "Camera" },
  { emoji: "🎵", name: "Music" },
  { emoji: "📚", name: "Book" },
  // Health
  { emoji: "🏥", name: "Hospital" },
  { emoji: "💊", name: "Pill" },
  { emoji: "💆", name: "Massage" },
  { emoji: "💇", name: "Hair" },
  // Personal Care
  { emoji: "💅", name: "Nail" },
  { emoji: "💄", name: "Makeup" },
  { emoji: "🪒", name: "Razor" },
  { emoji: "🧴", name: "Cream" },
  { emoji: "🧼", name: "Soap" },
  { emoji: "💧", name: "Water" },
  // Clothing
  { emoji: "👕", name: "T-Shirt" },
  { emoji: "👔", name: "Suit" },
  { emoji: "👗", name: "Dress" },
  { emoji: "👖", name: "Jeans" },
  { emoji: "👚", name: "Blouse" },
  { emoji: "👟", name: "Sneaker" },
  { emoji: "👞", name: "Loafer" },
  // Other
  { emoji: "📦", name: "Package" },
  { emoji: "🎁", name: "Gift" },
  { emoji: "💰", name: "Money" },
  { emoji: "💵", name: "Bill" },
  { emoji: "💳", name: "Card" },
  { emoji: "📄", name: "Document" },
  { emoji: "📮", name: "Mailbox" },
  { emoji: "🗂️", name: "Folder" },
  { emoji: "✨", name: "Sparkle" },
  { emoji: "🔔", name: "Bell" },
  { emoji: "⭐", name: "Star" },
  { emoji: "🎯", name: "Target" },
];

export function IconPicker({ value, onChange, label }: IconPickerProps): React.JSX.Element {
  const [search, setSearch] = useState("");

  const filteredIcons = ICONS.filter(
    (icon) => icon.name.toLowerCase().includes(search.toLowerCase()) || icon.emoji.includes(search),
  );

  const handleSelect = (icon: string, name: string) => {
    onChange(icon);
  };

  return (
    <div className="space-y-2">
      {label && (
        <label htmlFor="icon-picker-search" className="text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          id="icon-picker-search"
          type="text"
          placeholder="Search icons..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-9 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
          aria-label="Search icons"
        />
      </div>
      <div className="max-h-[300px] overflow-y-auto rounded-md border border-input bg-background p-2">
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-6 lg:grid-cols-7">
          {filteredIcons.map((icon) => {
            const isSelected = value === icon.emoji;
            return (
              <button
                key={icon.emoji}
                type="button"
                onClick={() => handleSelect(icon.emoji, icon.name)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg p-2 text-center transition-colors hover:bg-accent hover:text-accent-foreground",
                  "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
                  isSelected && "bg-primary/10 ring-2 ring-primary",
                )}
                aria-label={`Select ${icon.name} icon`}
                aria-pressed={isSelected}
              >
                <span className="text-2xl">{icon.emoji}</span>
                <span className="text-xs text-muted-foreground">{icon.name}</span>
              </button>
            );
          })}
        </div>
        {filteredIcons.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">No icons found</p>
          </div>
        )}
      </div>
    </div>
  );
}

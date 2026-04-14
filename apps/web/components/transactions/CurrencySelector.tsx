"use client";

import { currencyEnum } from "@finance/types";
import {
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@finance/ui";

type CurrencyCode = (typeof currencyEnum.options)[number];

interface CurrencySelectorProps {
  value: CurrencyCode;
  onChange: (value: CurrencyCode) => void;
  label?: string;
  disabled?: boolean;
}

export function CurrencySelector({
  value,
  onChange,
  label = "Currency",
  disabled = false,
}: CurrencySelectorProps): React.JSX.Element {
  return (
    <FormItem>
      <FormLabel>{label}</FormLabel>
      <Select
        value={value}
        onValueChange={(next) => onChange(next as CurrencyCode)}
        disabled={disabled}
      >
        <FormControl>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          {currencyEnum.options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  );
}

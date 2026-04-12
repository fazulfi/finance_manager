export interface IconPickerProps {
  value?: string;
  onChange: (icon: string) => void;
  label?: string;
}

export interface ColorPickerProps {
  value?: string;
  onChange: (color: string) => void;
  label?: string;
}

import * as React from "react";
import { Root as RadixRoot } from "@radix-ui/react-slot";

export type SlotProps = React.ComponentProps<typeof RadixRoot>;

const Slot = React.forwardRef<HTMLSlotElement, SlotProps>((props, ref) => (
  <RadixRoot ref={ref} {...props} />
));
Slot.displayName = "Slot";

export { Slot };

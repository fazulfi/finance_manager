import { Root as RadixRoot } from "@radix-ui/react-slot";
import * as React from "react";

export type SlotProps = React.ComponentProps<typeof RadixRoot>;

const Slot = React.forwardRef<HTMLSlotElement, SlotProps>((props, ref) => (
  <RadixRoot ref={ref} {...props} />
));
Slot.displayName = "Slot";

export { Slot };

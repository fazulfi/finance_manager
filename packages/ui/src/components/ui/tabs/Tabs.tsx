import { Root as RadixRoot } from "@radix-ui/react-tabs";
import * as React from "react";

export type TabsProps = React.ComponentProps<typeof RadixRoot>;

const Tabs = React.forwardRef<React.ElementRef<typeof RadixRoot>, TabsProps>((props, ref) => (
  <RadixRoot ref={ref} {...props} />
));
Tabs.displayName = RadixRoot.displayName || "Tabs";

export { Tabs };

import * as React from "react";
import { Root as RadixRoot } from "@radix-ui/react-tabs";

export type TabsProps = React.ComponentProps<typeof RadixRoot>;

const Tabs = React.forwardRef<React.ElementRef<typeof RadixRoot>, TabsProps>((props, ref) => (
  <RadixRoot ref={ref} {...props} />
));
Tabs.displayName = RadixRoot.displayName || "Tabs";

export { Tabs };

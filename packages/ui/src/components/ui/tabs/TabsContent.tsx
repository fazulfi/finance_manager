import * as React from "react";
import { Content as RadixContent } from "@radix-ui/react-tabs";

export type TabsContentProps = React.ComponentProps<typeof RadixContent>;

const TabsContent = React.forwardRef<React.ElementRef<typeof RadixContent>, TabsContentProps>(
  ({ className, ...props }, ref) => (
    <RadixContent
      ref={ref}
      className={`mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${className || ""}`}
      {...props}
    />
  ),
);
TabsContent.displayName = RadixContent.displayName || "TabsContent";

export { TabsContent };

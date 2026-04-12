import * as React from "react";
import { cn } from "../../lib/utils";

export interface ResizablePanelProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultSize?: number;
  minSize?: number;
  maxSize?: number;
  collapsible?: boolean;
  collapsedSize?: number;
  children: React.ReactNode;
}

const ResizablePanel = React.forwardRef<HTMLDivElement, ResizablePanelProps>(
  (
    {
      className,
      children,
      defaultSize,
      minSize = 10,
      maxSize = 100,
      collapsible,
      collapsedSize,
      ...props
    },
    ref,
  ) => {
    const [size, setSize] = React.useState<number>(defaultSize || 50);
    const [isCollapsed, setIsCollapsed] = React.useState<boolean>(false);
    const [isResizing, setIsResizing] = React.useState<boolean>(false);

    const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);
    }, []);

    const handleMouseUp = React.useCallback(() => {
      setIsResizing(false);
    }, []);

    const handleMouseMove = React.useCallback(
      (e: MouseEvent) => {
        if (!isResizing) return;

        const target = e.currentTarget as HTMLDivElement;
        const panel = target.parentElement;
        if (!panel) return;

        const panelRect = panel.getBoundingClientRect();
        const delta = e.clientX - panelRect.left;
        const percent = (delta / panelRect.width) * 100;

        const newWidth = size + percent;
        const clampedNewSize = Math.min(maxSize, Math.max(minSize, newWidth));

        setSize(clampedNewSize);
      },
      [size, isResizing, minSize, maxSize],
    );

    React.useEffect(() => {
      if (isResizing) {
        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
        return () => {
          document.removeEventListener("mousemove", handleMouseMove);
          document.removeEventListener("mouseup", handleMouseUp);
        };
      }
      return () => {};
    }, [isResizing, handleMouseMove, handleMouseUp]);

    // Handle collapse
    const handleCollapse = React.useCallback(() => {
      setIsCollapsed(!isCollapsed);
    }, [isCollapsed]);

    return (
      <div
        ref={ref}
        className={cn("flex-1 min-w-[var(--min-resizable-panel-width)] overflow-hidden", className)}
        style={{ width: isCollapsed ? `${collapsedSize || 20}%` : `${size}%` }}
        {...props}
      >
        {collapsible && (
          <div
            className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gray-300 hover:bg-gray-500 cursor-col-resize rounded-r transition-colors"
            onMouseDown={handleMouseDown}
          />
        )}
        {children}
      </div>
    );
  },
);
ResizablePanel.displayName = "ResizablePanel";

export { ResizablePanel };

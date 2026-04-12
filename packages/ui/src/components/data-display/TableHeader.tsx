import * as React from "react";

export interface TableHeaderProps extends React.HTMLAttributes<HTMLTableRowElement> {
  children: React.ReactNode;
}

const TableHeader = React.forwardRef<HTMLTableRowElement, TableHeaderProps>(
  ({ className, children, ...props }, ref) => (
    <tr ref={ref} className={className} {...props}>
      {children}
    </tr>
  ),
);
TableHeader.displayName = "TableHeader";

export { TableHeader };

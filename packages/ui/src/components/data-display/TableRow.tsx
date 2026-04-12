import * as React from "react";

export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  children: React.ReactNode;
}

const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ className, children, ...props }, ref) => (
    <tr ref={ref} className={className} {...props}>
      {children}
    </tr>
  ),
);
TableRow.displayName = "TableRow";

export { TableRow };

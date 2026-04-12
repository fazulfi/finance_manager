import * as React from "react";

export interface TableCellProps extends React.HTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode;
}

const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(
  ({ className, children, ...props }, ref) => (
    <td ref={ref} className={className} {...props}>
      {children}
    </td>
  ),
);
TableCell.displayName = "TableCell";

export { TableCell };

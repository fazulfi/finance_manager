import * as React from "react";

export interface TableHeadProps extends React.HTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode;
}

const TableHead = React.forwardRef<HTMLTableCellElement, TableHeadProps>(
  ({ className, children, ...props }, ref) => (
    <th ref={ref} className={className} {...props}>
      {children}
    </th>
  ),
);
TableHead.displayName = "TableHead";

export { TableHead };

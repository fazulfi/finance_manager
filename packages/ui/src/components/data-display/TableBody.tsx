import * as React from "react";

export interface TableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode;
}

const TableBody = React.forwardRef<HTMLTableSectionElement, TableBodyProps>(
  ({ className, children, ...props }, ref) => <tbody ref={ref} className={className} {...props} />,
);
TableBody.displayName = "TableBody";

export { TableBody };

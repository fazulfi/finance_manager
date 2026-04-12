"use client";

import * as React from "react";

export interface ColumnDef<T> {
  accessorKey: keyof T;
  header: string;
  cell?: (value: any) => React.ReactNode;
  sortable?: boolean;
}

export interface TableProps<T extends object> extends React.TableHTMLAttributes<HTMLTableElement> {
  columns: ColumnDef<T>[];
  data: T[];
}

const Table = React.forwardRef<HTMLTableElement, TableProps<object>>(
  ({ className, children, columns, data, ...props }, ref) => (
    <table ref={ref} className={className} {...props}>
      {children}
    </table>
  ),
);
Table.displayName = "Table";

const TableHead = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => <thead ref={ref} className={className} {...props} />);
TableHead.displayName = "TableHead";

const TableHeader = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => <tr ref={ref} className={className} {...props} />);
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => <tbody ref={ref} className={className} {...props} />);
TableBody.displayName = "TableBody";

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => <tr ref={ref} className={className} {...props} />,
);
TableRow.displayName = "TableRow";

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.HTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => <td ref={ref} className={className} {...props} />);
TableCell.displayName = "TableCell";

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => <tfoot ref={ref} className={className} {...props} />);
TableFooter.displayName = "TableFooter";

export { Table, TableHead, TableHeader, TableBody, TableRow, TableCell, TableFooter };

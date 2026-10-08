import * as React from "react"

import { cn } from "@/lib/utils"

// On phones a stacked table turns each row into a card: the column title is shown beside each
// value (copied from the header cells below) instead of making people scroll sideways.
// Pass stack={false} for wide, number-heavy tables that read better scrolled.
function Table({
  className,
  stack = true,
  ...props
}) {
  const ref = React.useRef(null)
  const boxRef = React.useRef(null)

  React.useEffect(() => {
    // A table wider than its box scrolls sideways, so keyboard users need to be able to focus it.
    const box = boxRef.current
    if (box) {
      if (box.scrollWidth > box.clientWidth) {
        box.setAttribute("tabindex", "0")
        box.setAttribute("role", "region")
        box.setAttribute("aria-label", "Table, scrolls sideways")
      } else {
        box.removeAttribute("tabindex")
        box.removeAttribute("role")
        box.removeAttribute("aria-label")
      }
    }

    const table = ref.current
    if (!stack || !table) return
    const labels = Array.from(table.querySelectorAll("thead th")).map((th) => th.textContent.trim())
    table.querySelectorAll("tbody tr").forEach((row) => {
      Array.from(row.children).forEach((cell, i) => {
        if (cell.colSpan > 1) return
        cell.setAttribute("data-label", labels[i] ?? "")
      })
    })
  })

  return (
    <div ref={boxRef} data-slot="table-container" className="relative w-full overflow-x-auto">
      <table
        ref={ref}
        data-slot="table"
        data-stack={stack ? "" : undefined}
        role="table"
        className={cn("w-full caption-bottom text-sm", className)}
        {...props} />
    </div>
  );
}

function TableHeader({
  className,
  ...props
}) {
  return (
    <thead
      data-slot="table-header"
      role="rowgroup"
      className={cn("[&_tr]:border-b", className)}
      {...props} />
  );
}

function TableBody({
  className,
  ...props
}) {
  return (
    <tbody
      data-slot="table-body"
      role="rowgroup"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props} />
  );
}

function TableFooter({
  className,
  ...props
}) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn("border-t bg-muted/50 font-medium [&>tr]:last:border-b-0", className)}
      {...props} />
  );
}

function TableRow({
  className,
  ...props
}) {
  return (
    <tr
      data-slot="table-row"
      role="row"
      className={cn(
        "border-b transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted",
        className
      )}
      {...props} />
  );
}

function TableHead({
  className,
  ...props
}) {
  return (
    <th
      data-slot="table-head"
      role="columnheader"
      className={cn(
        "h-10 px-2 text-left align-middle font-medium whitespace-nowrap text-foreground has-[[role=checkbox]]:pr-0",
        className
      )}
      {...props} />
  );
}

function TableCell({
  className,
  ...props
}) {
  return (
    <td
      data-slot="table-cell"
      role="cell"
      className={cn(
        "p-2 align-middle whitespace-nowrap has-[[role=checkbox]]:pr-0",
        className
      )}
      {...props} />
  );
}

function TableCaption({
  className,
  ...props
}) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      {...props} />
  );
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}

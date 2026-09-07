// Forme "Tableau" — 3 colonnes ou plus. Réutilise ui/table existant dans un
// conteneur overflow-x-auto : le <body> ne défile jamais horizontalement.
// Prête, non alimentée par aucun outil actuel (Lot 2).
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export function CorpsTableau({ columns, rows }: { columns: string[]; rows: string[][] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          {columns.map((col) => (
            <TableHead
              key={col}
              className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.14em]"
            >
              {col}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, rowIndex) => (
          <TableRow key={rowIndex} className="copilote-item-in hover:bg-transparent">
            {row.map((cell, cellIndex) => (
              <TableCell
                key={cellIndex}
                className={cn("tabular-nums", cellIndex === 0 && "font-semibold")}
              >
                {cell}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

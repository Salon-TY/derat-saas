import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function Pager({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min(total, page * pageSize + pageSize);

  if (total <= pageSize && page === 0) return null;

  return (
    <div className="flex items-center justify-between gap-2 pt-1">
      <span className="text-xs text-muted-foreground">
        {from}–{to} sur {total}
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="min-h-11 px-3"
          disabled={page <= 0}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Précédent
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="min-h-11 px-3"
          disabled={page >= pageCount - 1}
          onClick={() => onPageChange(page + 1)}
        >
          Suivant <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

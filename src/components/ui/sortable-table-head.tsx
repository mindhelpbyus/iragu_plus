import { ArrowUp, ArrowDown, ChevronsUpDown } from 'lucide-react';
import { TableHead } from './table';
import type { SortOrder } from '../../hooks/useSortableList';

interface SortableTableHeadProps<TField extends string> {
  field: TField;
  label: string;
  activeField: TField;
  sortOrder: SortOrder;
  onSort: (field: TField) => void;
  className?: string;
}

/**
 * A TableHead that's clickable to sort, showing the current direction on the
 * active column and a neutral affordance icon on the others. Shared across
 * every list table that has server-side sorting (Clients/Therapists/Organizations).
 */
export function SortableTableHead<TField extends string>({
  field,
  label,
  activeField,
  sortOrder,
  onSort,
  className,
}: SortableTableHeadProps<TField>) {
  const isActive = activeField === field;
  const Icon = isActive ? (sortOrder === 'asc' ? ArrowUp : ArrowDown) : ChevronsUpDown;

  return (
    <TableHead
      className={`font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer select-none hover:text-foreground transition-colors ${className ?? ''}`}
      onClick={() => onSort(field)}
    >
      <span className="inline-flex items-center gap-1.5">
        {label}
        <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-foreground' : 'text-muted-foreground/50'}`} />
      </span>
    </TableHead>
  );
}

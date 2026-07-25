import { SlidersHorizontal } from 'lucide-react';
import { Button } from './button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from './dropdown-menu';
import type { ColumnDef } from '../../hooks/useColumnVisibility';

interface ColumnVisibilityMenuProps {
  columns: ColumnDef[];
  isVisible: (id: string) => boolean;
  onToggle: (id: string) => void;
}

/** AWS-Console-style "Preferences" column picker — toggle which columns render. */
export function ColumnVisibilityMenu({ columns, isVisible, onToggle }: ColumnVisibilityMenuProps) {
  const toggleable = columns.filter((c) => !c.locked);
  if (toggleable.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="border-border/50">
          <SlidersHorizontal className="h-4 w-4 mr-2" />
          Columns
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Show columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {toggleable.map((col) => (
          <DropdownMenuCheckboxItem
            key={col.id}
            checked={isVisible(col.id)}
            onCheckedChange={() => onToggle(col.id)}
            onSelect={(e) => e.preventDefault()}
          >
            {col.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

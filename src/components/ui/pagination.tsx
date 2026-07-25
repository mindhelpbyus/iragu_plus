import * as React from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react";

import { cn } from "./utils";
import { Button } from "./button";

function Pagination({ className, ...props }: React.ComponentProps<"nav">) {
  return (
    <nav
      role="navigation"
      aria-label="pagination"
      data-slot="pagination"
      className={cn("mx-auto flex w-full justify-center", className)}
      {...props}
    />
  );
}

function PaginationContent({
  className,
  ...props
}: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn("flex flex-row items-center gap-3", className)}
      {...props}
    />
  );
}

function PaginationItem({ ...props }: React.ComponentProps<"li">) {
  return <li data-slot="pagination-item" {...props} />;
}

type PaginationLinkProps = {
  isActive?: boolean;
} & Pick<React.ComponentProps<typeof Button>, "size"> &
  React.ComponentProps<"a">;

function PaginationLink({
  className,
  isActive,
  size = "icon",
  ...props
}: PaginationLinkProps) {
  return (
    <a
      aria-current={isActive ? "page" : undefined}
      data-slot="pagination-link"
      data-active={isActive}
      className={cn(
        // Base styles matching design system
        "inline-flex items-center justify-center gap-1",
        "w-8 h-8 px-3 py-2 rounded",
        "text-xs font-medium",
        "transition-colors duration-150",
        
        // Active state - Orange background
        isActive && [
          "bg-[var(--interaction-primary-base,#1E7048)]",
          "text-[var(--content-light-primary,#FFFFFF)]",
        ],
        
        // Inactive state - Transparent
        !isActive && [
          "bg-transparent",
          "text-[var(--content-dark-primary,#000000)]",
          "hover:bg-[var(--action-secondary-hover,#E8ECF3)]",
        ],
        
        className,
      )}
      {...props}
    />
  );
}

function PaginationPrevious({
  className,
  disabled,
  ...props
}: React.ComponentProps<typeof PaginationLink> & { disabled?: boolean }) {
  return (
    <button
      aria-label="Go to previous page"
      disabled={disabled}
      className={cn(
        "w-8 h-8 p-2 rounded flex items-center justify-center gap-3",
        "transition-colors duration-150",
        
        // Enabled state
        !disabled && [
          "bg-[var(--action-secondary-base-2,#F7F9FB)]",
          "border-[var(--action-secondary-base-2,#F7F9FB)]",
          "hover:bg-[var(--action-secondary-hover,#E8ECF3)]",
        ],
        
        // Disabled state
        disabled && [
          "bg-[var(--action-secondary-disabled,#F7F9FB)]",
          "cursor-not-allowed",
        ],
        
        className,
      )}
      {...(props as any)}
    >
      <ChevronLeftIcon 
        className={cn(
          "size-3.5",
          disabled 
            ? "text-[var(--content-dark-disable,#D9DFEB)]"
            : "text-[var(--content-dark-primary,#000000)]"
        )}
      />
    </button>
  );
}

function PaginationNext({
  className,
  disabled,
  ...props
}: React.ComponentProps<typeof PaginationLink> & { disabled?: boolean }) {
  return (
    <button
      aria-label="Go to next page"
      disabled={disabled}
      className={cn(
        "w-8 h-8 p-2 rounded flex items-center justify-center gap-3",
        "transition-colors duration-150",
        
        // Enabled state
        !disabled && [
          "bg-[var(--action-secondary-base-2,#F7F9FB)]",
          "border-[var(--action-secondary-base-2,#F7F9FB)]",
          "hover:bg-[var(--action-secondary-hover,#E8ECF3)]",
        ],
        
        // Disabled state
        disabled && [
          "bg-[var(--action-secondary-disabled,#F7F9FB)]",
          "cursor-not-allowed",
        ],
        
        className,
      )}
      {...(props as any)}
    >
      <ChevronRightIcon 
        className={cn(
          "size-3.5",
          disabled 
            ? "text-[var(--content-dark-disable,#D9DFEB)]"
            : "text-[var(--content-dark-primary,#000000)]"
        )}
      />
    </button>
  );
}

function PaginationEllipsis({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden
      data-slot="pagination-ellipsis"
      className={cn(
        "inline-flex items-center justify-center w-8 h-8 px-3 py-2 rounded",
        "text-xs font-medium text-[var(--content-dark-primary,#000000)]",
        className
      )}
      {...props}
    >
      ...
      <span className="sr-only">More pages</span>
    </span>
  );
}

export {
  Pagination,
  PaginationContent,
  PaginationLink,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
};
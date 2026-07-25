import * as React from "react";
import { cn } from "./utils";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { Checkbox } from "./checkbox";
import { RadioGroupItem } from "./radio-group";

interface MenuItemProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Variant of the menu item */
  variant?: "default" | "with-avatar" | "with-avatar-large" | "with-icon" | "with-checkbox" | "with-radio";
  /** Avatar source for avatar variants */
  avatarSrc?: string;
  /** Avatar fallback text */
  avatarFallback?: string;
  /** Icon element for icon variant */
  icon?: React.ReactNode;
  /** Secondary text for large avatar variant */
  secondary?: string;
  /** Whether the item is disabled */
  disabled?: boolean;
  /** Whether the item is selected (for checkbox/radio) */
  selected?: boolean;
  /** Callback when checkbox/radio state changes */
  onSelectedChange?: (selected: boolean) => void;
}

const MenuItem = React.forwardRef<HTMLDivElement, MenuItemProps>(
  (
    {
      className,
      variant = "default",
      avatarSrc,
      avatarFallback,
      icon,
      secondary,
      disabled = false,
      selected = false,
      onSelectedChange,
      children,
      onClick,
      ...props
    },
    ref
  ) => {
    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (disabled) return;
      
      if (variant === "with-checkbox" || variant === "with-radio") {
        onSelectedChange?.(!selected);
      }
      
      onClick?.(e);
    };

    return (
      <div
        ref={ref}
        data-slot="menu-item"
        data-disabled={disabled}
        className={cn(
          // Base styles matching design system
          "flex w-full items-center gap-2 px-3 py-1.5",
          "text-sm",
          "text-[var(--content-dark-primary,#000000)]",
          "bg-card",
          "cursor-pointer select-none",
          "transition-colors duration-150",
          
          // Hover state
          !disabled && "hover:bg-[var(--interaction-secondary-hover,#F7F9FB)]",
          
          // Disabled state
          disabled && [
            "bg-[var(--interaction-secondary-disabled,#F7F9FB)]",
            "text-[var(--content-dark-disable,#D9DFEB)]",
            "cursor-not-allowed",
          ],
          
          // Large avatar variant spacing
          variant === "with-avatar-large" && "gap-3",
          
          className,
        )}
        onClick={handleClick}
        {...props}
      >
        {/* Checkbox variant */}
        {variant === "with-checkbox" && (
          <Checkbox
            checked={selected}
            disabled={disabled}
            onCheckedChange={onSelectedChange}
            className="pointer-events-none"
          />
        )}

        {/* Radio variant */}
        {variant === "with-radio" && (
          <RadioGroupItem
            value={children?.toString() || ""}
            disabled={disabled}
            className="pointer-events-none"
          />
        )}

        {/* Small Avatar variant */}
        {variant === "with-avatar" && (
          <Avatar className="size-6">
            <AvatarImage src={avatarSrc} />
            <AvatarFallback className="text-xs">
              {avatarFallback}
            </AvatarFallback>
          </Avatar>
        )}

        {/* Large Avatar variant */}
        {variant === "with-avatar-large" && (
          <Avatar className="size-10">
            <AvatarImage src={avatarSrc} />
            <AvatarFallback>
              {avatarFallback}
            </AvatarFallback>
          </Avatar>
        )}

        {/* Icon variant */}
        {variant === "with-icon" && icon && (
          <div className="flex size-10 items-center justify-center rounded-[5px] bg-muted">
            {icon}
          </div>
        )}

        {/* Content */}
        {variant === "with-avatar-large" || variant === "with-icon" ? (
          <div className="flex flex-1 flex-col items-start">
            <div
              className={cn(
                "text-sm",
                disabled
                  ? "text-[var(--content-dark-disable,#D9DFEB)]"
                  : "text-[var(--content-dark-primary,#000000)]"
              )}
            >
              {children}
            </div>
            {secondary && (
              <div
                className={cn(
                  "text-xs",
                  disabled
                    ? "text-[var(--content-dark-disable,#D9DFEB)]"
                    : "text-[var(--content-dark-tertiary,#A3A7B0)]"
                )}
              >
                {secondary}
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1">{children}</div>
        )}
      </div>
    );
  }
);

MenuItem.displayName = "MenuItem";

export { MenuItem };
export type { MenuItemProps };

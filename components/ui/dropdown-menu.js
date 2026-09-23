"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const DropdownMenuContext = React.createContext({
  isOpen: false,
  setIsOpen: () => {},
});

export function DropdownMenu({ children, onOpenChange }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef(null);

  const handleOpenChange = React.useCallback(
    (nextState) => {
      setIsOpen(nextState);
      onOpenChange?.(nextState);
    },
    [onOpenChange]
  );

  React.useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        handleOpenChange(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        handleOpenChange(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handleOpenChange]);

  return (
    <DropdownMenuContext.Provider value={{ isOpen, setIsOpen: handleOpenChange }}>
      <div className="relative inline-block text-left" ref={containerRef}>
        {children}
      </div>
    </DropdownMenuContext.Provider>
  );
}

export function DropdownMenuTrigger({ asChild = false, children, className = "", ...props }) {
  const { isOpen, setIsOpen } = React.useContext(DropdownMenuContext);

  const handleClick = (e) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      onClick: (e) => {
        children.props?.onClick?.(e);
        handleClick(e);
      },
      "aria-expanded": isOpen,
      "aria-haspopup": "true",
      className: cn(children.props?.className, className),
      ...props,
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-expanded={isOpen}
      aria-haspopup="true"
      className={className}
      {...props}
    >
      {children}
    </button>
  );
}

export function DropdownMenuContent({
  align = "end",
  sideOffset = 4,
  className = "",
  children,
  ...props
}) {
  const { isOpen } = React.useContext(DropdownMenuContext);

  if (!isOpen) return null;

  const alignClasses =
    align === "end"
      ? "right-0 origin-top-right"
      : align === "center"
      ? "left-1/2 -translate-x-1/2 origin-top"
      : "left-0 origin-top-left";

  return (
    <div
      role="menu"
      tabIndex={-1}
      data-state={isOpen ? "open" : "closed"}
      style={{ marginTop: `${sideOffset}px` }}
      className={cn(
        "absolute z-[9999] animate-in fade-in zoom-in-95 duration-150",
        alignClasses,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function DropdownMenuItem({ asChild = false, children, className = "", ...props }) {
  const { setIsOpen } = React.useContext(DropdownMenuContext);

  const handleClick = (e) => {
    setIsOpen(false);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      onClick: (e) => {
        children.props?.onClick?.(e);
        handleClick(e);
      },
      className: cn(children.props?.className, className),
      role: "menuitem",
      ...props,
    });
  }

  return (
    <div
      role="menuitem"
      onClick={handleClick}
      className={cn("cursor-pointer select-none", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function DropdownMenuSeparator({ className = "", ...props }) {
  return (
    <div
      role="separator"
      className={cn("h-[1px] w-full my-1 bg-stone-200 dark:bg-stone-800", className)}
      {...props}
    />
  );
}

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface DropdownMenuContextProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.MutableRefObject<HTMLButtonElement | null>;
}

const DropdownMenuContext = React.createContext<DropdownMenuContextProps | null>(null);

function useDropdownMenu() {
  const ctx = React.useContext(DropdownMenuContext);
  if (!ctx) throw new Error("DropdownMenu components must be used within a DropdownMenu");
  return ctx;
}

export function DropdownMenu({
  children,
  open: controlledOpen,
  onOpenChange,
  defaultOpen = false,
}: {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = (next: boolean) => {
    if (!isControlled) setUncontrolledOpen(next);
    onOpenChange?.(next);
  };
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen, triggerRef }}>
      {children}
    </DropdownMenuContext.Provider>
  );
}

export const DropdownMenuTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }
>(({ asChild, children, onClick, ...props }, forwardedRef) => {
  const { open, setOpen, triggerRef } = useDropdownMenu();
  const ref = React.useRef<HTMLButtonElement>(null);

  React.useImperativeHandle(
    forwardedRef,
    () => ref.current!,
    []
  );

  React.useEffect(() => {
    triggerRef.current = ref.current;
  }, [triggerRef]);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e);
    setOpen(!open);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement, {
      ref,
      onClick: handleClick,
      "aria-haspopup": "menu",
      "aria-expanded": open,
      ...props,
    });
  }

  return (
    <button
      ref={ref}
      type="button"
      onClick={handleClick}
      aria-haspopup="menu"
      aria-expanded={open}
      {...props}
    >
      {children}
    </button>
  );
});
DropdownMenuTrigger.displayName = "DropdownMenuTrigger";

export function DropdownMenuContent({
  children,
  className,
  align = "start",
}: {
  children: React.ReactNode;
  className?: string;
  align?: "start" | "end" | "center";
}) {
  const { open, setOpen, triggerRef } = useDropdownMenu();
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [style, setStyle] = React.useState<React.CSSProperties>({});

  React.useEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const base: React.CSSProperties = {
      position: "fixed",
      top: rect.bottom + 8,
    };
    if (align === "start") base.left = rect.left;
    if (align === "end") base.right = window.innerWidth - rect.right;
    if (align === "center") {
      base.left = rect.left + rect.width / 2;
      base.transform = "translateX(-50%)";
    }
    setStyle(base);
  }, [open, align, triggerRef]);

  React.useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const handleClick = (e: MouseEvent) => {
      if (
        contentRef.current &&
        !contentRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [open, setOpen, triggerRef]);

  if (!open) return null;

  return createPortal(
    <div
      ref={contentRef}
      role="menu"
      style={style}
      className={cn(
        "z-50 min-w-[8rem] overflow-hidden rounded-xl border border-border bg-white p-1 shadow-lg animate-in fade-in zoom-in-95",
        className
      )}
    >
      {children}
    </div>,
    document.body
  );
}

export function DropdownMenuItem({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      role="menuitem"
      type="button"
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center rounded-lg px-3 py-2 text-sm font-medium text-foreground outline-none transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

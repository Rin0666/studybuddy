import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth, useIsAuthenticated } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, LogOut, Loader2 } from "lucide-react";

export function AuthButton() {
  const { user, isAdmin, loading, signOut } = useAuth();
  const isAuthenticated = useIsAuthenticated();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const location = useLocation();

  if (loading) {
    return (
      <Button variant="ghost" size="sm" disabled aria-hidden="true">
        <Loader2 className="w-4 h-4 animate-spin" />
      </Button>
    );
  }

  if (isAuthenticated && user) {
    return (
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 font-medium text-foreground/80 hover:text-foreground"
            aria-label="Open account menu"
          >
            <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
              {user.email?.charAt(0).toUpperCase() ?? "U"}
            </div>
            <span className="hidden sm:inline max-w-[140px] truncate">{user.email}</span>
            {isAdmin && (
              <span className="hidden sm:inline rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                Admin
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[160px]">
          <DropdownMenuItem
            disabled
            className="font-medium text-foreground/70 cursor-default"
          >
            <User className="w-4 h-4 mr-2" />
            <span className="max-w-[180px] truncate">{user.email}</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={async () => {
              setSigningOut(true);
              await signOut();
              setSigningOut(false);
              setOpen(false);
            }}
            disabled={signingOut}
            className="text-destructive focus:text-destructive cursor-pointer"
          >
            {signingOut ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <LogOut className="w-4 h-4 mr-2" />
            )}
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {location.pathname !== "/login" && (
        <Button
          size="sm"
          asChild
          className="bg-primary hover:bg-primary/90 text-on-primary font-semibold"
        >
          <Link to="/login">Log in</Link>
        </Button>
      )}
      {location.pathname !== "/signup" && (
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="font-medium text-foreground/80 hover:text-foreground"
        >
          <Link to="/signup">Sign up</Link>
        </Button>
      )}
    </div>
  );
}

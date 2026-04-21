import { Link, useLocation, useNavigate } from "react-router-dom";
import { GraduationCap, Users, ClipboardList, LogOut, History } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ReactNode } from "react";

const nav = [
  { to: "/", label: "Home", icon: ClipboardList },
  { to: "/students", label: "Students", icon: Users },
  { to: "/logs", label: "Logs", icon: History },
];

const AppShell = ({ children }: { children: ReactNode }) => {
  const { pathname } = useLocation();
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen pb-28 md:pb-0">
      <header className="sticky top-0 z-40 glass-panel border-b border-border/40">
        <div className="container flex items-center justify-between py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl aurora-bg grid place-items-center shadow-lg">
              <GraduationCap className="w-5 h-5 text-background" />
            </div>
            <span className="font-bold tracking-tight text-lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Attendly<span className="aurora-text">Pro</span>
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {nav.map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-colors ${
                  pathname === to ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-card/50"
                }`}>
                <Icon className="w-4 h-4" />{label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-xs text-muted-foreground truncate max-w-[140px]">{user?.email}</span>
            <Button variant="ghost" size="icon" onClick={async () => { await signOut(); navigate("/auth"); }}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="container py-6 animate-fade-in">{children}</main>
      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-4 left-4 right-4 z-40 glass-card rounded-2xl px-2 py-2 flex justify-around">
        {nav.map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl text-xs transition-all ${
              pathname === to ? "text-primary scale-105" : "text-muted-foreground"
            }`}>
            <Icon className="w-5 h-5" />{label}
          </Link>
        ))}
      </nav>
    </div>
  );
};

export default AppShell;
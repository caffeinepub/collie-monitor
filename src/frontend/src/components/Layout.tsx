import { Link, useLocation } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  TrendingUp,
  Layers,
  BarChart3,
  History,
  Hexagon,
} from "lucide-react";

const navItems = [
  { path: "/", label: "Markets", icon: TrendingUp },
  { path: "/categories", label: "Categories", icon: Layers },
  { path: "/strategies", label: "Strategies", icon: BarChart3 },
  { path: "/history", label: "History", icon: History },
];

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-sidebar-border bg-sidebar">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="gradient-header flex items-center gap-3 border-b border-sidebar-border p-6">
            <div className="relative">
              <Hexagon className="h-10 w-10 text-primary" strokeWidth={1.5} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-4 w-4 rounded-full bg-primary" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold text-sidebar-foreground">
                Collie Monitor
              </h1>
              <p className="text-xs text-muted-foreground">Paper Trading</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="border-t border-sidebar-border p-4">
            <p className="text-xs text-muted-foreground">
              © 2026. Built with{" "}
              <a
                href="https://caffeine.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                caffeine.ai
              </a>
            </p>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-64 flex-1">
        <div className="candlestick-bg min-h-screen">{children}</div>
      </main>
    </div>
  );
}

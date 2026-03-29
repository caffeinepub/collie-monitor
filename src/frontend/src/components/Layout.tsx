import { cn } from "@/lib/utils";
import { Link, useLocation } from "@tanstack/react-router";
import {
  Activity,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  PawPrint,
  Radar,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";

const navItems = [
  { path: "/", label: "BTC Monitor", icon: Activity },
  { path: "/scanner", label: "Scanner", icon: Radar },
  { path: "/estrategias", label: "Estratégias", icon: TrendingUp },
  { path: "/diario", label: "Diário", icon: BookOpen },
];

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem("sidebar-collapsed") === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("sidebar-collapsed", String(collapsed));
    } catch {}
  }, [collapsed]);

  const sidebarWidth = collapsed ? "w-16" : "w-56";
  const mainMargin = collapsed ? "ml-16" : "ml-56";

  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg)" }}>
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen border-r transition-all duration-300",
          sidebarWidth,
        )}
        style={{
          background: "var(--surface)",
          borderColor: "var(--clr-border)",
        }}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div
            className={cn(
              "flex items-center border-b transition-all duration-300",
              collapsed ? "justify-center p-4" : "gap-3 px-4 py-5",
            )}
            style={{ borderColor: "var(--clr-border)" }}
          >
            <PawPrint
              className="h-7 w-7 shrink-0"
              style={{ color: "var(--green)" }}
              strokeWidth={2}
            />
            {!collapsed && (
              <div className="overflow-hidden">
                <h1
                  className="text-base font-bold leading-tight tracking-wide"
                  style={{ color: "var(--text)" }}
                >
                  Collie Monitor
                </h1>
                <p className="text-xs" style={{ color: "var(--muted-clr)" }}>
                  Paper Trading
                </p>
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  data-ocid={`nav.${item.label.toLowerCase().replace(/[^a-z0-9]/g, "")}.link`}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "flex items-center rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-150",
                    collapsed ? "justify-center" : "gap-3",
                  )}
                  style={{
                    background: isActive
                      ? "rgba(245,124,31,0.15)"
                      : "transparent",
                    color: isActive ? "var(--orange)" : "var(--muted-clr)",
                    borderLeft:
                      isActive && !collapsed
                        ? "2px solid var(--orange)"
                        : "2px solid transparent",
                  }}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          {!collapsed && (
            <div
              className="border-t p-4"
              style={{ borderColor: "var(--clr-border)" }}
            >
              <p className="text-xs" style={{ color: "var(--muted-clr)" }}>
                © {new Date().getFullYear()}.{" "}
                <a
                  href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(typeof window !== "undefined" ? window.location.hostname : "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--orange)" }}
                  className="hover:underline"
                >
                  caffeine.ai
                </a>
              </p>
            </div>
          )}
        </div>
      </aside>

      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        data-ocid="sidebar.toggle"
        className={cn(
          "fixed top-1/2 z-50 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full border shadow-md transition-all duration-300",
        )}
        style={{
          left: collapsed ? "52px" : "212px",
          background: "var(--surface2)",
          borderColor: "var(--orange)",
          color: "var(--orange)",
        }}
        title={collapsed ? "Expandir" : "Recolher"}
      >
        {collapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </button>

      {/* Main content */}
      <main
        className={cn(
          "flex-1 transition-all duration-300 min-h-screen",
          mainMargin,
        )}
      >
        {children}
      </main>
    </div>
  );
}

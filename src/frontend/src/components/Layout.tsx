import { Link, useLocation } from "@tanstack/react-router";
import { Activity, BookOpen, PawPrint, Radar, TrendingUp } from "lucide-react";

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

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ background: "var(--bg)" }}
    >
      {/* Top header */}
      <header
        className="fixed top-0 left-0 right-0 z-40 border-b"
        style={{
          background: "var(--surface)",
          borderColor: "var(--clr-border)",
        }}
      >
        {/* Logo row */}
        <div className="flex items-center gap-3 px-4 pt-3 pb-2">
          <PawPrint
            className="h-6 w-6 shrink-0"
            style={{ color: "var(--green)" }}
            strokeWidth={2}
          />
          <div>
            <h1
              className="text-sm font-bold leading-tight tracking-wide"
              style={{ color: "var(--text)" }}
            >
              Collie Monitor
            </h1>
            <p
              className="text-xs leading-none"
              style={{ color: "var(--muted-clr)" }}
            >
              Paper Trading
            </p>
          </div>
        </div>

        {/* Tab nav row — horizontal scroll on small screens */}
        <nav
          className="flex overflow-x-auto px-2 pb-0"
          style={{ scrollbarWidth: "none" }}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                data-ocid={`nav.${item.label.toLowerCase().replace(/[^a-z0-9]/g, "")}.link`}
                className="flex shrink-0 items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-all duration-150 border-b-2"
                style={{
                  color: isActive ? "var(--orange)" : "var(--muted-clr)",
                  borderBottomColor: isActive ? "var(--orange)" : "transparent",
                  background: "transparent",
                }}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="whitespace-nowrap">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </header>

      {/* Main content — offset for fixed header (logo ~52px + tabs ~42px = ~94px) */}
      <main className="flex-1" style={{ paddingTop: "94px" }}>
        {children}

        {/* Footer */}
        <footer
          className="border-t px-4 py-3 text-center"
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
        </footer>
      </main>
    </div>
  );
}

import { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Brain, LogOut, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

export type WorkspaceNavItem = {
  id: string;
  label: string;
  icon?: ReactNode;
};

interface Props {
  title: string;
  subtitle?: string;
  badge?: string;
  headerExtra?: ReactNode;
  children: ReactNode;
  workspaceNav?: {
    sectionLabel?: string;
    items: WorkspaceNavItem[];
    activeId: string;
    onSelect: (id: string) => void;
  };
  workspaceActions?: {
    onSync?: () => void;
  };
}

const SIDEBAR_BG = "bg-[#1A0B2E]";
const ACCENT_LINE = "#9B51E0";
const ACTION_PINK = "#D53F8C";

const DashboardShell = ({ title, subtitle, badge, headerExtra, children, workspaceNav, workspaceActions }: Props) => {
  const { signOut, user } = useAuth();
  const nav = useNavigate();

  const handleLogout = async () => {
    await signOut();
    nav("/");
  };

  if (workspaceNav) {
    const section = workspaceNav.sectionLabel ?? "Dashboards";
    return (
      <div className="min-h-screen flex flex-col md:flex-row w-full">
        <aside
          className={cn(
            SIDEBAR_BG,
            "text-white shrink-0 w-full md:w-64 md:min-h-screen flex md:flex-col",
            "border-b md:border-b-0 md:border-r border-white/10",
          )}
        >
          <div className="p-4 md:p-6 md:border-b border-white/10 flex items-center justify-between md:block">
            <Link to="/" className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
                <Brain className="h-5 w-5" strokeWidth={2.2} />
              </span>
              <span className="font-semibold tracking-tight">CogniPredict</span>
            </Link>
          </div>
          <p className="hidden md:block px-4 pt-4 pb-1 text-[10px] uppercase tracking-[0.2em] text-white/45 font-semibold">
            {section}
          </p>
          <nav className="flex md:flex-col flex-row gap-1 p-2 md:px-3 md:pb-4 md:flex-1 overflow-x-auto md:overflow-visible no-scrollbar">
            {workspaceNav.items.map((item) => {
              const active = workspaceNav.activeId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => workspaceNav.onSelect(item.id)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-left whitespace-nowrap md:w-full transition-colors",
                    active
                      ? "bg-white/[0.12] text-white font-medium shadow-sm border-l-[3px] md:border-l-4 pl-2 md:pl-[calc(0.75rem-3px)] md:pl-[calc(0.75rem-4px)]"
                      : "text-white/75 hover:bg-white/[0.08] hover:text-white border-l-[3px] md:border-l-4 border-transparent pl-2 md:pl-[calc(0.75rem-3px)] md:pl-[calc(0.75rem-4px)]",
                  )}
                  style={active ? { borderLeftColor: ACCENT_LINE } : undefined}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
          <div className="hidden md:block p-4 border-t border-white/10 space-y-2">
            <p className="text-xs text-white/45 truncate px-1" title={user?.email ?? undefined}>
              {user?.email}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="w-full border-white/20 text-white bg-transparent hover:bg-white/10 hover:text-white"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" /> Logout
            </Button>
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-w-0 bg-[#F8F9FA]">
          <header className="bg-white border-b border-black/[0.06] px-4 sm:px-6 lg:px-10 py-5 lg:py-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                {badge && (
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{badge}</span>
                )}
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mt-0.5 tracking-tight">{title}</h1>
                {subtitle && <p className="text-gray-500 mt-2 max-w-2xl text-sm leading-relaxed">{subtitle}</p>}
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {headerExtra}
                <Button
                  type="button"
                  size="sm"
                  className="rounded-lg text-white border-0 shadow-sm h-9 px-4"
                  style={{ backgroundColor: ACTION_PINK }}
                  onClick={() => workspaceActions?.onSync?.() ?? window.location.reload()}
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  Sync
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-5">
              <span className="inline-flex items-center rounded-md h-9 px-4 text-sm bg-[#E8EAEC] text-gray-700">
                Date range
              </span>
              <span className="inline-flex items-center rounded-md h-9 px-4 text-sm bg-[#E8EAEC] text-gray-700">
                Departments
              </span>
              <span className="inline-flex items-center rounded-md h-9 px-4 text-sm bg-[#E8EAEC] text-gray-700">
                Specializations
              </span>
            </div>
          </header>
          <main className="flex-1 px-4 sm:px-6 lg:px-10 py-6 lg:py-8">{children}</main>
          <div className="md:hidden border-t border-black/5 bg-white p-4 flex flex-col gap-2">
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            <Button variant="outline" size="sm" className="w-full" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" /> Logout
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-background/70 backdrop-blur sticky top-0 z-40">
        <div className="container flex items-center justify-between py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
              <Brain className="h-5 w-5 text-primary-foreground" strokeWidth={2.4} />
            </span>
            <span className="font-display text-lg font-semibold">
              Cogni<span className="text-primary">Predict</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            {headerExtra}
            <span className="hidden sm:inline text-sm text-muted-foreground">{user?.email}</span>
            <Button variant="soft" size="sm" className="rounded-full" onClick={handleLogout}>
              <LogOut className="h-4 w-4" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-10 lg:py-14">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div>
            {badge && (
              <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                {badge}
              </span>
            )}
            <h1 className="mt-3 font-display text-4xl font-medium tracking-tight">{title}</h1>
            {subtitle && <p className="mt-2 text-muted-foreground max-w-2xl">{subtitle}</p>}
          </div>
        </div>
        <div className="mt-10">{children}</div>
      </main>
    </div>
  );
};

export default DashboardShell;

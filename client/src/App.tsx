import { Switch, Route, Router, Link, useLocation } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider, useTheme } from "@/components/ThemeProvider";
import { PerplexityAttribution } from "@/components/PerplexityAttribution";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home";
import SchedulePage from "@/pages/schedule";
import StatsPage from "@/pages/stats";
import RosterPage from "@/pages/roster";
import NewsPage from "@/pages/news";
import {
  Home,
  Calendar,
  BarChart3,
  Users,
  Newspaper,
  Moon,
  Sun,
} from "lucide-react";

const navItems = [
  { path: "/", label: "Home", icon: Home },
  { path: "/schedule", label: "Schedule", icon: Calendar },
  { path: "/stats", label: "Stats", icon: BarChart3 },
  { path: "/roster", label: "Roster", icon: Users },
  { path: "/news", label: "News", icon: Newspaper },
];

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg hover:bg-muted transition-colors"
      aria-label="Toggle theme"
      data-testid="theme-toggle"
    >
      {theme === "dark" ? (
        <Sun className="w-4 h-4" />
      ) : (
        <Moon className="w-4 h-4" />
      )}
    </button>
  );
}

function BottomNav() {
  const [location] = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-t border-border md:hidden"
      data-testid="bottom-nav"
    >
      <div className="flex items-center justify-around h-16 px-2 max-w-lg mx-auto">
        {navItems.map(({ path, label, icon: Icon }) => {
          const isActive =
            path === "/"
              ? location === "/" || location === ""
              : location.startsWith(path);
          return (
            <Link
              key={path}
              href={path}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors min-w-[56px] ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid={`nav-${label.toLowerCase()}`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : ""}`} />
              <span
                className={`text-[10px] font-semibold ${
                  isActive ? "text-primary" : ""
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function DesktopSidebar() {
  const [location] = useLocation();

  return (
    <aside
      className="hidden md:flex flex-col w-60 min-h-screen border-r border-border bg-card fixed left-0 top-0 bottom-0 z-40"
      data-testid="desktop-sidebar"
    >
      {/* Header */}
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
            <svg viewBox="0 0 32 32" className="w-5 h-5 text-white" fill="none">
              <circle cx="16" cy="16" r="13" stroke="currentColor" strokeWidth="2" />
              <path d="M16 3C16 3 10 10 10 16C10 22 16 29 16 29" stroke="currentColor" strokeWidth="1.5" />
              <path d="M16 3C16 3 22 10 22 16C22 22 16 29 16 29" stroke="currentColor" strokeWidth="1.5" />
              <line x1="3" y1="16" x2="29" y2="16" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-bold leading-tight">IU Softball</h1>
            <p className="text-xs text-muted-foreground">Fan Hub</p>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ path, label, icon: Icon }) => {
          const isActive =
            path === "/"
              ? location === "/" || location === ""
              : location.startsWith(path);
          return (
            <Link
              key={path}
              href={path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
              data-testid={`sidebar-${label.toLowerCase()}`}
            >
              <Icon className="w-4.5 h-4.5" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-xs text-muted-foreground">Theme</span>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}

function TopBar() {
  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border md:hidden">
      <div className="flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <svg viewBox="0 0 32 32" className="w-4.5 h-4.5 text-white" fill="none">
              <circle cx="16" cy="16" r="13" stroke="currentColor" strokeWidth="2.5" />
              <path d="M16 3C16 3 10 10 10 16C10 22 16 29 16 29" stroke="currentColor" strokeWidth="2" />
              <path d="M16 3C16 3 22 10 22 16C22 22 16 29 16 29" stroke="currentColor" strokeWidth="2" />
              <line x1="3" y1="16" x2="29" y2="16" stroke="currentColor" strokeWidth="2" />
            </svg>
          </div>
          <span className="text-base font-bold">IU Softball</span>
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <DesktopSidebar />
      <TopBar />
      <main className="md:ml-60">
        <div className="max-w-2xl mx-auto px-4 py-5 pb-24 md:pb-8 md:px-6 md:py-6">
          {children}
        </div>
        <footer className="pb-20 md:pb-4 px-4 text-center">
          <PerplexityAttribution />
        </footer>
      </main>
      <BottomNav />
    </div>
  );
}

function AppRouter() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/schedule" component={SchedulePage} />
        <Route path="/stats" component={StatsPage} />
        <Route path="/roster/:id" component={RosterPage} />
        <Route path="/roster" component={RosterPage} />
        <Route path="/news" component={NewsPage} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router hook={useHashLocation}>
            <AppRouter />
          </Router>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;

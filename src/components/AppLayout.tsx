import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import { Sun, Moon } from "lucide-react";
import { useLocation } from "react-router-dom";

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/tenants": "Contratos Ativos",
  "/former-tenants": "Ex-inquilinos",
  "/overdue": "Inadimplentes",
  "/alerts": "Alertas",
  "/calendar": "Calendário",
  "/reports": "Relatórios",
  "/receipt": "Recibo",
  "/search": "Busca Rápida",
  "/whatsapp": "WhatsApp",
};

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const pageTitle = PAGE_TITLES[location.pathname] || "";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b bg-card px-4 sm:px-6 shrink-0">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              {pageTitle && <h2 className="text-sm font-semibold text-foreground hidden sm:block">{pageTitle}</h2>}
            </div>
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-9 w-9 rounded-lg">
              {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>
          </header>
          <main className="flex-1 p-4 sm:p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

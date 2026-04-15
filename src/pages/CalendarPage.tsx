import { useTenants } from "@/hooks/use-tenants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function CalendarPage() {
  const { data: tenants } = useTenants("active");
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();

  const MONTHS_PT = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  const getTenantsByDay = (day: number) => tenants?.filter((t) => t.payment_day === day) || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">Calendário - {MONTHS_PT[currentMonth]} {currentYear}</h1>
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground mb-2">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => <div key={d}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayTenants = getTenantsByDay(day);
              const isToday = day === today.getDate();
              return (
                <div key={day} className={`min-h-[60px] p-1 border rounded text-xs ${isToday ? "border-primary bg-primary/5" : ""}`}>
                  <span className={`font-medium ${isToday ? "text-primary" : ""}`}>{day}</span>
                  {dayTenants.map((t) => (
                    <div key={t.id} className="truncate text-primary mt-0.5">{t.name}</div>
                  ))}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

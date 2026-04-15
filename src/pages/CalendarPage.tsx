import { useState } from "react";
import { useTenants, useAllPayments } from "@/hooks/use-tenants";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, DollarSign, Home, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const MONTHS_PT = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export default function CalendarPage() {
  const navigate = useNavigate();
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const { data: tenants } = useTenants("active");
  const { data: payments } = useAllPayments(currentYear);

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); }
    else setCurrentMonth(currentMonth - 1);
  };
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); }
    else setCurrentMonth(currentMonth + 1);
  };

  const getDayInfo = (day: number) => {
    const dueTenants = tenants?.filter((t) => t.payment_day === day) || [];
    const month = currentMonth + 1;
    const paidTenants = dueTenants.filter((t) => {
      const p = payments?.find((p) => p.tenant_id === t.id && p.month === month);
      return p?.status === "paid";
    });
    const pendingTenants = dueTenants.filter((t) => {
      const p = payments?.find((p) => p.tenant_id === t.id && p.month === month);
      return !p || p.status !== "paid";
    });
    const contractEvents = tenants?.filter((t) => {
      if (t.entry_date) {
        const d = new Date(t.entry_date);
        if (d.getDate() === day && d.getMonth() === currentMonth && d.getFullYear() === currentYear) return true;
      }
      if (t.exit_date) {
        const d = new Date(t.exit_date);
        if (d.getDate() === day && d.getMonth() === currentMonth && d.getFullYear() === currentYear) return true;
      }
      return false;
    }) || [];
    return { dueTenants, paidTenants, pendingTenants, contractEvents };
  };

  const selectedInfo = selectedDay ? getDayInfo(selectedDay) : null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Calendário</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="font-semibold min-w-[180px] text-center">{MONTHS_PT[currentMonth]} {currentYear}</span>
          <Button variant="outline" size="icon" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-2">
        <div className="flex items-center gap-1 text-xs"><div className="w-3 h-3 rounded-full bg-success" /> Pago</div>
        <div className="flex items-center gap-1 text-xs"><div className="w-3 h-3 rounded-full bg-destructive" /> Pendente</div>
        <div className="flex items-center gap-1 text-xs"><div className="w-3 h-3 rounded-full bg-primary" /> Vencimento</div>
        <div className="flex items-center gap-1 text-xs"><div className="w-3 h-3 rounded-full bg-warning" /> Contrato</div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground mb-2">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => <div key={d}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const info = getDayInfo(day);
              const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
              const hasEvents = info.dueTenants.length > 0 || info.contractEvents.length > 0;

              return (
                <div
                  key={day}
                  onClick={() => hasEvents && setSelectedDay(day)}
                  className={`min-h-[72px] p-1.5 border rounded-lg text-xs transition-all ${
                    isToday ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "hover:bg-muted/50"
                  } ${hasEvents ? "cursor-pointer hover:shadow-sm" : ""} ${selectedDay === day ? "ring-2 ring-primary" : ""}`}
                >
                  <span className={`font-semibold ${isToday ? "text-primary" : ""}`}>{day}</span>
                  <div className="flex flex-wrap gap-0.5 mt-1">
                    {info.paidTenants.length > 0 && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 bg-success/10 text-success border-success/30">
                        {info.paidTenants.length} ✓
                      </Badge>
                    )}
                    {info.pendingTenants.length > 0 && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 bg-destructive/10 text-destructive border-destructive/30">
                        {info.pendingTenants.length} !
                      </Badge>
                    )}
                    {info.contractEvents.length > 0 && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 bg-warning/10 text-warning border-warning/30">
                        📄
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedDay} onOpenChange={() => setSelectedDay(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Dia {selectedDay} - {MONTHS_PT[currentMonth]} {currentYear}</DialogTitle>
          </DialogHeader>
          {selectedInfo && (
            <div className="space-y-4">
              {selectedInfo.paidTenants.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-success flex items-center gap-1 mb-2"><DollarSign className="h-4 w-4" /> Pagos</h3>
                  {selectedInfo.paidTenants.map((t) => (
                    <div key={t.id} className="flex items-center justify-between py-1.5 px-2 rounded bg-success/5 mb-1 cursor-pointer hover:bg-success/10" onClick={() => { setSelectedDay(null); navigate(`/tenants/${t.id}`); }}>
                      <span className="text-sm">{t.name}</span>
                      <span className="text-xs text-muted-foreground">R$ {Number(t.rent_amount).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
              {selectedInfo.pendingTenants.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-destructive flex items-center gap-1 mb-2"><AlertTriangle className="h-4 w-4" /> Pendentes</h3>
                  {selectedInfo.pendingTenants.map((t) => (
                    <div key={t.id} className="flex items-center justify-between py-1.5 px-2 rounded bg-destructive/5 mb-1 cursor-pointer hover:bg-destructive/10" onClick={() => { setSelectedDay(null); navigate(`/tenants/${t.id}`); }}>
                      <span className="text-sm">{t.name}</span>
                      <span className="text-xs text-muted-foreground">R$ {Number(t.rent_amount).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
              {selectedInfo.contractEvents.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-warning flex items-center gap-1 mb-2"><Home className="h-4 w-4" /> Contratos</h3>
                  {selectedInfo.contractEvents.map((t) => {
                    const isEntry = t.entry_date && new Date(t.entry_date).getDate() === selectedDay;
                    return (
                      <div key={t.id} className="flex items-center justify-between py-1.5 px-2 rounded bg-warning/5 mb-1 cursor-pointer hover:bg-warning/10" onClick={() => { setSelectedDay(null); navigate(`/tenants/${t.id}`); }}>
                        <span className="text-sm">{t.name}</span>
                        <Badge variant="outline" className="text-[10px]">{isEntry ? "Entrada" : "Saída"}</Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState } from "react";
import { useTenants, useAllPayments } from "@/hooks/use-tenants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const MONTHS_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export default function ReportsPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const { data: tenants } = useTenants();
  const { data: payments } = useAllPayments(year);

  const activeTenants = tenants?.filter((t) => t.status === "active") || [];
  const expectedMonthly = activeTenants.reduce((sum, t) => sum + Number(t.rent_amount), 0);

  const monthlyData = MONTHS_PT.map((m, i) => {
    const monthPayments = payments?.filter((p) => p.month === i + 1 && p.status === "paid") || [];
    const received = monthPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const pending = payments?.filter((p) => p.month === i + 1 && p.status === "pending")?.length || 0;
    return { month: m, received, pending, expected: expectedMonthly };
  });

  const totalReceived = monthlyData.reduce((sum, m) => sum + m.received, 0);
  const totalPending = payments?.filter((p) => p.status === "pending")?.length || 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Relatórios</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setYear(year - 1)}>← {year - 1}</Button>
          <span className="text-sm font-bold flex items-center">{year}</span>
          <Button variant="outline" size="sm" onClick={() => setYear(year + 1)}>{year + 1} →</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Receita Total ({year})</p><p className="text-2xl font-bold text-success">R$ {totalReceived.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Receita Esperada / Mês</p><p className="text-2xl font-bold">R$ {expectedMonthly.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Pagamentos Pendentes</p><p className="text-2xl font-bold text-destructive">{totalPending}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Receita Mensal</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {monthlyData.map((m) => (
              <div key={m.month} className="flex items-center gap-3">
                <span className="text-sm font-medium w-8">{m.month}</span>
                <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-success rounded-full transition-all" style={{ width: m.expected > 0 ? `${Math.min(100, (m.received / m.expected) * 100)}%` : "0%" }} />
                </div>
                <span className="text-xs font-medium w-28 text-right">R$ {m.received.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                {m.pending > 0 && <span className="text-xs text-destructive">{m.pending} pend.</span>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

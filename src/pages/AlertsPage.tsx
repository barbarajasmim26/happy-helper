import { useTenants } from "@/hooks/use-tenants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, AlertTriangle, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { differenceInDays, parseISO } from "date-fns";

export default function AlertsPage() {
  const { data: tenants } = useTenants("active");
  const navigate = useNavigate();
  const today = new Date();

  const expiredContracts = tenants?.filter((t) => t.exit_date && parseISO(t.exit_date) < today) || [];
  const expiringContracts = tenants?.filter((t) => {
    if (!t.exit_date) return false;
    const d = differenceInDays(parseISO(t.exit_date), today);
    return d >= 0 && d <= 30;
  }) || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">Alertas</h1>

      {expiredContracts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive" />Contratos Vencidos</h2>
          {expiredContracts.map((t) => {
            const days = differenceInDays(today, parseISO(t.exit_date!));
            return (
              <Card key={t.id} className="border-destructive/30">
                <CardContent className="pt-4 flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.property?.address} - Casa {t.house_number}</p>
                    <p className="text-xs text-muted-foreground">Venceu em: {new Date(t.exit_date!).toLocaleDateString("pt-BR")}</p>
                    <Badge variant="destructive" className="mt-1">Vencido há {days} dias</Badge>
                  </div>
                  <Button size="sm" onClick={() => navigate(`/tenants/${t.id}`)}>Renovar</Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {expiringContracts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2"><Clock className="h-5 w-5 text-warning" />Próximos do Vencimento</h2>
          {expiringContracts.map((t) => {
            const days = differenceInDays(parseISO(t.exit_date!), today);
            return (
              <Card key={t.id} className="border-warning/30">
                <CardContent className="pt-4 flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.property?.address} - Casa {t.house_number}</p>
                    <p className="text-xs text-muted-foreground">Vence em: {new Date(t.exit_date!).toLocaleDateString("pt-BR")}</p>
                    <Badge className="mt-1 bg-warning text-warning-foreground">Faltam {days} dias</Badge>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => navigate(`/tenants/${t.id}`)}>Ver perfil</Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {!expiredContracts.length && !expiringContracts.length && (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhum alerta no momento! ✅</CardContent></Card>
      )}
    </div>
  );
}

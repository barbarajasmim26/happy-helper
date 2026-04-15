import { useState } from "react";
import { useTenants, useUpdateTenant } from "@/hooks/use-tenants";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Clock, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { differenceInDays, parseISO } from "date-fns";
import { toast } from "sonner";

export default function AlertsPage() {
  const { data: activeTenants } = useTenants("active");
  const { data: formerTenants } = useTenants("former");
  const updateTenant = useUpdateTenant();
  const navigate = useNavigate();
  const today = new Date();

  const [renewOpen, setRenewOpen] = useState(false);
  const [renewTenant, setRenewTenant] = useState<any>(null);
  const [renewForm, setRenewForm] = useState({ entry_date: "", exit_date: "" });

  const allTenants = [...(activeTenants || []), ...(formerTenants || [])];

  const expiredContracts = allTenants.filter((t) => t.exit_date && parseISO(t.exit_date) < today);
  const expiringContracts = (activeTenants || []).filter((t) => {
    if (!t.exit_date) return false;
    const d = differenceInDays(parseISO(t.exit_date), today);
    return d >= 0 && d <= 30;
  });

  const openRenew = (tenant: any) => {
    setRenewTenant(tenant);
    const nextYear = new Date();
    setRenewForm({
      entry_date: new Date().toISOString().split("T")[0],
      exit_date: new Date(nextYear.getFullYear() + 1, nextYear.getMonth(), nextYear.getDate()).toISOString().split("T")[0],
    });
    setRenewOpen(true);
  };

  const handleRenew = async () => {
    if (!renewTenant) return;
    try {
      await updateTenant.mutateAsync({
        id: renewTenant.id,
        status: "active",
        entry_date: renewForm.entry_date,
        exit_date: renewForm.exit_date,
      });
      toast.success(`Contrato de ${renewTenant.name} renovado!`);
      setRenewOpen(false);
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">Alertas</h1>

      {expiredContracts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive" />Contratos Vencidos</h2>
          {expiredContracts.map((t) => {
            const days = differenceInDays(today, parseISO(t.exit_date!));
            return (
              <Card key={t.id} className="border-destructive/30 hover:shadow-md transition-shadow">
                <CardContent className="pt-4 flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.property?.address} - Casa {t.house_number}</p>
                    <p className="text-xs text-muted-foreground">Venceu em: {new Date(t.exit_date!).toLocaleDateString("pt-BR")}</p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="destructive">Vencido há {days} dias</Badge>
                      {t.status === "former" && <Badge variant="secondary">Ex-inquilino</Badge>}
                    </div>
                  </div>
                  <Button size="sm" onClick={() => openRenew(t)} className="bg-success hover:bg-success/90 text-success-foreground">
                    <RefreshCw className="mr-1 h-3 w-3" />Renovar
                  </Button>
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
              <Card key={t.id} className="border-warning/30 hover:shadow-md transition-shadow">
                <CardContent className="pt-4 flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.property?.address} - Casa {t.house_number}</p>
                    <p className="text-xs text-muted-foreground">Vence em: {new Date(t.exit_date!).toLocaleDateString("pt-BR")}</p>
                    <Badge className="mt-1 bg-warning text-warning-foreground">Faltam {days} dias</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => navigate(`/tenants/${t.id}`)}>Ver perfil</Button>
                    <Button size="sm" onClick={() => openRenew(t)} className="bg-success hover:bg-success/90 text-success-foreground">
                      <RefreshCw className="mr-1 h-3 w-3" />Renovar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {!expiredContracts.length && !expiringContracts.length && (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhum alerta no momento! ✅</CardContent></Card>
      )}

      <Dialog open={renewOpen} onOpenChange={setRenewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-success" />Renovar Contrato
            </DialogTitle>
          </DialogHeader>
          {renewTenant && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="font-semibold">{renewTenant.name}</p>
                <p className="text-sm text-muted-foreground">{renewTenant.property?.address} - Casa {renewTenant.house_number}</p>
                <p className="text-sm text-muted-foreground">Aluguel: R$ {Number(renewTenant.rent_amount).toFixed(2)}</p>
              </div>
              <div>
                <Label>Data de Renovação (Início)</Label>
                <Input type="date" value={renewForm.entry_date} onChange={(e) => setRenewForm({ ...renewForm, entry_date: e.target.value })} />
              </div>
              <div>
                <Label>Data de Vencimento do Contrato</Label>
                <Input type="date" value={renewForm.exit_date} onChange={(e) => setRenewForm({ ...renewForm, exit_date: e.target.value })} />
              </div>
              <Button className="w-full bg-success hover:bg-success/90 text-success-foreground" onClick={handleRenew} disabled={updateTenant.isPending}>
                {updateTenant.isPending ? "Renovando..." : "Confirmar Renovação"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

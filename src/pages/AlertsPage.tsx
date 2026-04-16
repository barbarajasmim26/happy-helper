import { useState } from "react";
import { useTenants, useUpdateTenant, useAllPayments } from "@/hooks/use-tenants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Clock, RefreshCw, XCircle, DollarSign, Bell, FileWarning, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { differenceInDays, parseISO } from "date-fns";
import { toast } from "sonner";

export default function AlertsPage() {
  const { data: activeTenants } = useTenants("active");
  const { data: formerTenants } = useTenants("former");
  const { data: allPayments } = useAllPayments(new Date().getFullYear());
  const updateTenant = useUpdateTenant();
  const navigate = useNavigate();
  const today = new Date();
  const month = today.getMonth() + 1;

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

  // Payment overdue alerts
  const overduePayments = (activeTenants || []).filter((t) => {
    const payment = allPayments?.find((p: any) => p.tenant_id === t.id && p.month === month);
    if (payment?.status === "paid" || payment?.status === "deposit") return false;
    return (t.payment_day || 10) < today.getDate();
  });

  // No phone registered
  const noPhone = (activeTenants || []).filter((t) => !t.phone);

  // No contract dates
  const noContractDates = (activeTenants || []).filter((t) => !t.entry_date || !t.exit_date);

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

  const handleNotRenew = async (tenant: any) => {
    if (!confirm(`Tem certeza que não deseja renovar o contrato de ${tenant.name}?`)) return;
    try {
      await updateTenant.mutateAsync({ id: tenant.id, status: "former" });
      toast.success(`${tenant.name} movido para ex-inquilinos.`);
    } catch (e: any) { toast.error(e.message); }
  };

  const totalAlerts = expiredContracts.length + expiringContracts.length + overduePayments.length + noPhone.length + noContractDates.length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Card className={`${expiredContracts.length > 0 ? "border-destructive/30 bg-destructive/5" : ""}`}>
          <CardContent className="pt-4 pb-3 text-center">
            <AlertTriangle className={`h-5 w-5 mx-auto mb-1 ${expiredContracts.length > 0 ? "text-destructive" : "text-muted-foreground"}`} />
            <p className="text-xl font-bold">{expiredContracts.length}</p>
            <p className="text-[10px] text-muted-foreground">Vencidos</p>
          </CardContent>
        </Card>
        <Card className={`${expiringContracts.length > 0 ? "border-warning/30 bg-warning/5" : ""}`}>
          <CardContent className="pt-4 pb-3 text-center">
            <Clock className={`h-5 w-5 mx-auto mb-1 ${expiringContracts.length > 0 ? "text-warning" : "text-muted-foreground"}`} />
            <p className="text-xl font-bold">{expiringContracts.length}</p>
            <p className="text-[10px] text-muted-foreground">Vencendo</p>
          </CardContent>
        </Card>
        <Card className={`${overduePayments.length > 0 ? "border-destructive/30 bg-destructive/5" : ""}`}>
          <CardContent className="pt-4 pb-3 text-center">
            <DollarSign className={`h-5 w-5 mx-auto mb-1 ${overduePayments.length > 0 ? "text-destructive" : "text-muted-foreground"}`} />
            <p className="text-xl font-bold">{overduePayments.length}</p>
            <p className="text-[10px] text-muted-foreground">Pag. Atrasado</p>
          </CardContent>
        </Card>
        <Card className={`${noPhone.length > 0 ? "border-info/30 bg-info/5" : ""}`}>
          <CardContent className="pt-4 pb-3 text-center">
            <Bell className={`h-5 w-5 mx-auto mb-1 ${noPhone.length > 0 ? "text-info" : "text-muted-foreground"}`} />
            <p className="text-xl font-bold">{noPhone.length}</p>
            <p className="text-[10px] text-muted-foreground">Sem Telefone</p>
          </CardContent>
        </Card>
        <Card className={`${noContractDates.length > 0 ? "border-warning/30 bg-warning/5" : ""}`}>
          <CardContent className="pt-4 pb-3 text-center">
            <FileWarning className={`h-5 w-5 mx-auto mb-1 ${noContractDates.length > 0 ? "text-warning" : "text-muted-foreground"}`} />
            <p className="text-xl font-bold">{noContractDates.length}</p>
            <p className="text-[10px] text-muted-foreground">Sem Datas</p>
          </CardContent>
        </Card>
      </div>

      {/* Overdue Payments */}
      {overduePayments.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-destructive" />Pagamentos em Atraso
          </h2>
          {overduePayments.map((t) => {
            const daysLate = today.getDate() - (t.payment_day || 10);
            return (
              <Card key={t.id} className="border-destructive/20 hover:shadow-md transition-all">
                <CardContent className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-destructive/10 text-destructive font-bold text-sm">
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.property?.address} - Casa {t.house_number}</p>
                      <div className="flex gap-1.5 mt-1">
                        <Badge variant="destructive" className="text-[10px]">{daysLate} dias de atraso</Badge>
                        <Badge variant="outline" className="text-[10px]">R$ {Number(t.rent_amount).toFixed(2)}</Badge>
                      </div>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => navigate(`/tenants/${t.id}`)}>
                    <Eye className="mr-1 h-3 w-3" />Ver perfil
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Expired Contracts */}
      {expiredContracts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />Contratos Vencidos
          </h2>
          {expiredContracts.map((t) => {
            const days = differenceInDays(today, parseISO(t.exit_date!));
            return (
              <Card key={t.id} className="border-destructive/20 hover:shadow-md transition-all">
                <CardContent className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-destructive/10 text-destructive font-bold text-sm">
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.property?.address} - Casa {t.house_number}</p>
                      <p className="text-xs text-muted-foreground">Venceu: {new Date(t.exit_date!).toLocaleDateString("pt-BR")}</p>
                      <div className="flex gap-1.5 mt-1">
                        <Badge variant="destructive" className="text-[10px]">Há {days} dias</Badge>
                        {t.status === "former" && <Badge variant="secondary" className="text-[10px]">Ex-inquilino</Badge>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => openRenew(t)} className="bg-success hover:bg-success/90 text-success-foreground">
                      <RefreshCw className="mr-1 h-3 w-3" />Renovar
                    </Button>
                    <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => handleNotRenew(t)}>
                      <XCircle className="mr-1 h-3 w-3" />Não Renovar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Expiring Contracts */}
      {expiringContracts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5 text-warning" />Próximos do Vencimento
          </h2>
          {expiringContracts.map((t) => {
            const days = differenceInDays(parseISO(t.exit_date!), today);
            return (
              <Card key={t.id} className="border-warning/20 hover:shadow-md transition-all">
                <CardContent className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-warning/10 text-warning font-bold text-sm">
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.property?.address} - Casa {t.house_number}</p>
                      <p className="text-xs text-muted-foreground">Vence: {new Date(t.exit_date!).toLocaleDateString("pt-BR")}</p>
                      <Badge className="mt-1 bg-warning text-warning-foreground text-[10px]">Faltam {days} dias</Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => navigate(`/tenants/${t.id}`)}>
                      <Eye className="mr-1 h-3 w-3" />Ver perfil
                    </Button>
                    <Button size="sm" onClick={() => openRenew(t)} className="bg-success hover:bg-success/90 text-success-foreground">
                      <RefreshCw className="mr-1 h-3 w-3" />Renovar
                    </Button>
                    <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => handleNotRenew(t)}>
                      <XCircle className="mr-1 h-3 w-3" />Não Renovar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Admin warnings */}
      {(noPhone.length > 0 || noContractDates.length > 0) && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />Avisos Administrativos
          </h2>
          {noPhone.length > 0 && (
            <Card className="border-primary/20">
              <CardContent className="pt-4">
                <p className="text-sm font-medium mb-2">📱 Inquilinos sem telefone cadastrado:</p>
                <div className="flex flex-wrap gap-2">
                  {noPhone.map((t) => (
                    <Badge key={t.id} variant="outline" className="cursor-pointer hover:bg-primary/10" onClick={() => navigate(`/tenants/${t.id}`)}>
                      {t.name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          {noContractDates.length > 0 && (
            <Card className="border-warning/20">
              <CardContent className="pt-4">
                <p className="text-sm font-medium mb-2">📋 Inquilinos sem datas de contrato:</p>
                <div className="flex flex-wrap gap-2">
                  {noContractDates.map((t) => (
                    <Badge key={t.id} variant="outline" className="cursor-pointer hover:bg-warning/10" onClick={() => navigate(`/tenants/${t.id}`)}>
                      {t.name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {totalAlerts === 0 && (
        <Card><CardContent className="py-12 text-center">
          <div className="text-4xl mb-3">✅</div>
          <p className="text-muted-foreground font-medium">Nenhum alerta no momento!</p>
          <p className="text-xs text-muted-foreground mt-1">Tudo está em dia.</p>
        </CardContent></Card>
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

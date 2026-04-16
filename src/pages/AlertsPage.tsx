import { useState } from "react";
import { useTenants, useUpdateTenant, useAllPayments } from "@/hooks/use-tenants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Clock, RefreshCw, XCircle, DollarSign, Bell, FileWarning, Eye, CalendarClock, CalendarX2, CalendarCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { differenceInDays, parseISO, isToday } from "date-fns";
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

  // Split expiring contracts: today, soon (1-15 days), approaching (16-30 days)
  const expiringToday = (activeTenants || []).filter((t) => t.exit_date && isToday(parseISO(t.exit_date)));
  const expiringSoon = (activeTenants || []).filter((t) => {
    if (!t.exit_date) return false;
    const d = differenceInDays(parseISO(t.exit_date), today);
    return d >= 1 && d <= 15;
  });
  const expiringLater = (activeTenants || []).filter((t) => {
    if (!t.exit_date) return false;
    const d = differenceInDays(parseISO(t.exit_date), today);
    return d >= 16 && d <= 30;
  });
  const expiredContracts = allTenants.filter((t) => t.exit_date && parseISO(t.exit_date) < today && !isToday(parseISO(t.exit_date)));

  // Payment overdue
  const overduePayments = (activeTenants || []).filter((t) => {
    const payment = allPayments?.find((p: any) => p.tenant_id === t.id && p.month === month);
    if (payment?.status === "paid" || payment?.status === "paid_late" || payment?.status === "deposit") return false;
    return (t.payment_day || 10) < today.getDate();
  });

  const noPhone = (activeTenants || []).filter((t) => !t.phone);
  const noContractDates = (activeTenants || []).filter((t) => !t.entry_date || !t.exit_date);

  const openRenew = (tenant: any) => {
    setRenewTenant(tenant);
    setRenewForm({
      entry_date: new Date().toISOString().split("T")[0],
      exit_date: new Date(today.getFullYear() + 1, today.getMonth(), today.getDate()).toISOString().split("T")[0],
    });
    setRenewOpen(true);
  };

  const handleRenew = async () => {
    if (!renewTenant) return;
    try {
      await updateTenant.mutateAsync({ id: renewTenant.id, status: "active", entry_date: renewForm.entry_date, exit_date: renewForm.exit_date });
      toast.success(`Contrato de ${renewTenant.name} renovado!`);
      setRenewOpen(false);
    } catch (e: any) { toast.error(e.message); }
  };

  const handleNotRenew = async (tenant: any) => {
    if (!confirm(`Não renovar contrato de ${tenant.name}? Será movido para ex-inquilinos.`)) return;
    try {
      await updateTenant.mutateAsync({ id: tenant.id, status: "former" });
      toast.success(`${tenant.name} movido para ex-inquilinos.`);
    } catch (e: any) { toast.error(e.message); }
  };

  const totalAlerts = expiredContracts.length + expiringToday.length + expiringSoon.length + expiringLater.length + overduePayments.length + noPhone.length + noContractDates.length;

  const ContractCard = ({ t, badgeText, badgeClass, showDays }: { t: any; badgeText: string; badgeClass: string; showDays?: number }) => (
    <Card key={t.id} className="hover:shadow-md transition-all">
      <CardContent className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground font-bold text-sm">{t.name.charAt(0)}</div>
          <div>
            <p className="font-semibold text-sm">{t.name}</p>
            <p className="text-xs text-muted-foreground">{t.property?.address} - Casa {t.house_number}</p>
            <p className="text-xs text-muted-foreground">{t.exit_date ? new Date(t.exit_date).toLocaleDateString("pt-BR") : ""}</p>
            <div className="flex gap-1.5 mt-1">
              <Badge className={`text-[10px] ${badgeClass}`}>{badgeText}</Badge>
              {t.status === "former" && <Badge variant="secondary" className="text-[10px]">Ex-inquilino</Badge>}
            </div>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => navigate(`/tenants/${t.id}`)} className="rounded-lg"><Eye className="mr-1 h-3 w-3" />Perfil</Button>
          <Button size="sm" onClick={() => openRenew(t)} className="rounded-lg bg-success hover:bg-success/90 text-success-foreground"><RefreshCw className="mr-1 h-3 w-3" />Renovar</Button>
          <Button size="sm" variant="outline" className="rounded-lg text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => handleNotRenew(t)}><XCircle className="mr-1 h-3 w-3" />Não Renovar</Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { count: overduePayments.length, label: "Pag. Atrasado", icon: DollarSign, active: overduePayments.length > 0, color: "destructive" },
          { count: expiringToday.length, label: "Vence Hoje", icon: CalendarX2, active: expiringToday.length > 0, color: "destructive" },
          { count: expiringSoon.length, label: "Vence 1-15d", icon: CalendarClock, active: expiringSoon.length > 0, color: "warning" },
          { count: expiringLater.length, label: "Vence 16-30d", icon: CalendarCheck, active: expiringLater.length > 0, color: "primary" },
          { count: expiredContracts.length, label: "Vencidos", icon: AlertTriangle, active: expiredContracts.length > 0, color: "destructive" },
          { count: noPhone.length, label: "Sem Telefone", icon: Bell, active: noPhone.length > 0, color: "info" },
          { count: noContractDates.length, label: "Sem Datas", icon: FileWarning, active: noContractDates.length > 0, color: "warning" },
        ].map((item, i) => (
          <Card key={i} className={item.active ? `border-${item.color}/30 bg-${item.color}/5` : ""}>
            <CardContent className="pt-4 pb-3 text-center">
              <item.icon className={`h-5 w-5 mx-auto mb-1 ${item.active ? `text-${item.color}` : "text-muted-foreground"}`} />
              <p className="text-xl font-bold">{item.count}</p>
              <p className="text-[10px] text-muted-foreground">{item.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Payment Overdue */}
      {overduePayments.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold flex items-center gap-2"><DollarSign className="h-5 w-5 text-destructive" />Pagamentos em Atraso</h2>
          {overduePayments.map((t) => {
            const daysLate = today.getDate() - (t.payment_day || 10);
            return (
              <Card key={t.id} className="border-destructive/20 hover:shadow-md transition-all">
                <CardContent className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-destructive/10 text-destructive font-bold text-sm">{t.name.charAt(0)}</div>
                    <div>
                      <p className="font-semibold text-sm">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.property?.address} - Casa {t.house_number}</p>
                      <div className="flex gap-1.5 mt-1">
                        <Badge variant="destructive" className="text-[10px]">{daysLate} dias de atraso</Badge>
                        <Badge variant="outline" className="text-[10px]">R$ {Number(t.rent_amount).toFixed(2)}</Badge>
                      </div>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => navigate(`/tenants/${t.id}`)} className="rounded-lg"><Eye className="mr-1 h-3 w-3" />Ver perfil</Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Expiring Today */}
      {expiringToday.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold flex items-center gap-2"><CalendarX2 className="h-5 w-5 text-destructive" />Vence Hoje!</h2>
          {expiringToday.map((t) => <ContractCard key={t.id} t={t} badgeText="Vence HOJE" badgeClass="bg-destructive text-destructive-foreground" />)}
        </div>
      )}

      {/* Expiring 1-15 days */}
      {expiringSoon.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold flex items-center gap-2"><CalendarClock className="h-5 w-5 text-warning" />Vence em até 15 dias</h2>
          {expiringSoon.map((t) => {
            const days = differenceInDays(parseISO(t.exit_date!), today);
            return <ContractCard key={t.id} t={t} badgeText={`Faltam ${days} dias`} badgeClass="bg-warning text-warning-foreground" />;
          })}
        </div>
      )}

      {/* Expiring 16-30 days */}
      {expiringLater.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold flex items-center gap-2"><CalendarCheck className="h-5 w-5 text-primary" />Vence em 16-30 dias</h2>
          {expiringLater.map((t) => {
            const days = differenceInDays(parseISO(t.exit_date!), today);
            return <ContractCard key={t.id} t={t} badgeText={`Faltam ${days} dias`} badgeClass="bg-primary/10 text-primary border-primary/30" />;
          })}
        </div>
      )}

      {/* Expired */}
      {expiredContracts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive" />Contratos Vencidos</h2>
          {expiredContracts.map((t) => {
            const days = differenceInDays(today, parseISO(t.exit_date!));
            return <ContractCard key={t.id} t={t} badgeText={`Vencido há ${days} dias`} badgeClass="bg-destructive text-destructive-foreground" />;
          })}
        </div>
      )}

      {/* Admin Warnings */}
      {(noPhone.length > 0 || noContractDates.length > 0) && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold flex items-center gap-2"><Bell className="h-5 w-5 text-primary" />Avisos Administrativos</h2>
          {noPhone.length > 0 && (
            <Card className="border-primary/20">
              <CardContent className="pt-4">
                <p className="text-sm font-medium mb-2">📱 Sem telefone cadastrado:</p>
                <div className="flex flex-wrap gap-2">{noPhone.map((t) => (<Badge key={t.id} variant="outline" className="cursor-pointer hover:bg-primary/10" onClick={() => navigate(`/tenants/${t.id}`)}>{t.name}</Badge>))}</div>
              </CardContent>
            </Card>
          )}
          {noContractDates.length > 0 && (
            <Card className="border-warning/20">
              <CardContent className="pt-4">
                <p className="text-sm font-medium mb-2">📋 Sem datas de contrato:</p>
                <div className="flex flex-wrap gap-2">{noContractDates.map((t) => (<Badge key={t.id} variant="outline" className="cursor-pointer hover:bg-warning/10" onClick={() => navigate(`/tenants/${t.id}`)}>{t.name}</Badge>))}</div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {totalAlerts === 0 && (
        <Card><CardContent className="py-12 text-center">
          <div className="text-4xl mb-3">✅</div>
          <p className="text-muted-foreground font-medium">Nenhum alerta no momento!</p>
        </CardContent></Card>
      )}

      {/* Renew Dialog */}
      <Dialog open={renewOpen} onOpenChange={setRenewOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><RefreshCw className="h-5 w-5 text-success" />Renovar Contrato</DialogTitle></DialogHeader>
          {renewTenant && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="font-semibold">{renewTenant.name}</p>
                <p className="text-sm text-muted-foreground">{renewTenant.property?.address} - Casa {renewTenant.house_number}</p>
              </div>
              <div><Label>Início</Label><Input type="date" value={renewForm.entry_date} onChange={(e) => setRenewForm({ ...renewForm, entry_date: e.target.value })} /></div>
              <div><Label>Vencimento</Label><Input type="date" value={renewForm.exit_date} onChange={(e) => setRenewForm({ ...renewForm, exit_date: e.target.value })} /></div>
              <Button className="w-full rounded-xl bg-success hover:bg-success/90 text-success-foreground" onClick={handleRenew} disabled={updateTenant.isPending}>
                {updateTenant.isPending ? "Renovando..." : "Confirmar Renovação"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

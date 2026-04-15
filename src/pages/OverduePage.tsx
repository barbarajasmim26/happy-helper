import { useTenants, useAllPayments, useUpsertPayment } from "@/hooks/use-tenants";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, MessageCircle, Check, Eye, TrendingUp, TrendingDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { openWhatsApp, getMessageTemplates } from "@/lib/whatsapp";

export default function OverduePage() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const { data: tenants } = useTenants("active");
  const { data: allPayments } = useAllPayments(year);
  const upsertPayment = useUpsertPayment();
  const navigate = useNavigate();

  // Determine payment pattern: check last 6 months
  const getPaymentPattern = (tenantId: string) => {
    const recentPayments: boolean[] = [];
    for (let m = month - 1; m >= Math.max(1, month - 6); m--) {
      const p = allPayments?.find((p) => p.tenant_id === tenantId && p.month === m);
      recentPayments.push(p?.status === "paid");
    }
    const paidCount = recentPayments.filter(Boolean).length;
    const total = recentPayments.length;
    if (total === 0) return { label: "Novo", color: "secondary" as const, icon: null };
    const ratio = paidCount / total;
    if (ratio >= 0.8) return { label: "Paga e Mora", color: "warning" as const, icon: TrendingUp, description: "Costuma pagar, atraso pontual" };
    if (ratio <= 0.3) return { label: "Mora e Paga", color: "destructive" as const, icon: TrendingDown, description: "Atrasos frequentes" };
    return { label: "Irregular", color: "secondary" as const, icon: AlertTriangle, description: "Pagamento instável" };
  };

  const overdue = tenants?.filter((t) => {
    const payment = allPayments?.find((p) => p.tenant_id === t.id && p.month === month);
    if (payment?.status === "paid" || payment?.status === "deposit") return false;
    return (t.payment_day || 10) < now.getDate();
  }) || [];

  const calcFees = (amount: number, lateFee = 2, interest = 1) => {
    const fee = amount * (lateFee / 100);
    const int = amount * (interest / 100);
    return { fee, interest: int, total: amount + fee + int };
  };

  const markPaid = async (tenantId: string, amount: number) => {
    try {
      await upsertPayment.mutateAsync({ tenant_id: tenantId, month, year, status: "paid", amount, paid_at: now.toISOString().split("T")[0] });
      toast.success("Marcado como pago!");
    } catch (e: any) { toast.error(e.message); }
  };

  const sendOverdueWhatsApp = (t: any) => {
    if (!t.phone) { toast.error("Telefone não cadastrado."); return; }
    const { total } = calcFees(Number(t.rent_amount));
    const templates = getMessageTemplates({
      name: t.name, amount: Number(t.rent_amount), month, year,
      property: t.property?.address || "", houseNumber: t.house_number || "",
      dueDay: t.payment_day || 10, lateFee: 2, interest: 1, totalWithFees: total,
    });
    openWhatsApp({ phone: t.phone, message: templates.overdue });
  };

  const pendingRevenue = overdue.reduce((sum, t) => {
    const { total } = calcFees(Number(t.rent_amount));
    return sum + total;
  }, 0);

  const MONTHS_PT = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">Inquilinos em Atraso</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-destructive">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Inadimplentes</p>
            <p className="text-2xl font-bold text-destructive">{overdue.length}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-warning">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Receita Pendente</p>
            <p className="text-2xl font-bold text-warning">R$ {pendingRevenue.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-primary">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Mês Referência</p>
            <p className="text-2xl font-bold">{MONTHS_PT[month - 1]}/{year}</p>
          </CardContent>
        </Card>
      </div>

      {!overdue.length ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhum inquilino em atraso! 🎉</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {overdue.map((t) => {
            const { fee, interest, total } = calcFees(Number(t.rent_amount));
            const pattern = getPaymentPattern(t.id);
            const PatternIcon = pattern.icon;
            return (
              <Card key={t.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold">{t.name}</p>
                        <Badge variant={pattern.color} className="text-[10px] flex items-center gap-1">
                          {PatternIcon && <PatternIcon className="h-3 w-3" />}
                          {pattern.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{t.property?.address} - Casa {t.house_number}</p>
                      {pattern.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 italic">{pattern.description}</p>
                      )}
                      <div className="flex gap-3 mt-2 text-xs flex-wrap">
                        <span className="px-2 py-0.5 rounded bg-muted">Original: R$ {Number(t.rent_amount).toFixed(2)}</span>
                        <span className="px-2 py-0.5 rounded bg-destructive/10 text-destructive">Multa (2%): R$ {fee.toFixed(2)}</span>
                        <span className="px-2 py-0.5 rounded bg-destructive/10 text-destructive">Juros (1%): R$ {interest.toFixed(2)}</span>
                        <Badge variant="destructive">Total: R$ {total.toFixed(2)}</Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="bg-success hover:bg-success/90 text-success-foreground" onClick={() => markPaid(t.id, total)}>
                        <Check className="mr-1 h-3 w-3" />Pago
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => sendOverdueWhatsApp(t)}>
                        <MessageCircle className="mr-1 h-3 w-3" />Cobrar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => navigate(`/tenants/${t.id}`)}>
                        <Eye className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

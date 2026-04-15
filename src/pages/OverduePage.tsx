import { useTenants, useAllPayments, useUpsertPayment } from "@/hooks/use-tenants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, MessageCircle, Check, Eye } from "lucide-react";
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
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Inadimplentes</p><p className="text-2xl font-bold text-destructive">{overdue.length}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Receita Pendente</p><p className="text-2xl font-bold text-warning">R$ {pendingRevenue.toFixed(2)}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Mês Referência</p><p className="text-2xl font-bold">{MONTHS_PT[month - 1]}/{year}</p></CardContent></Card>
      </div>

      {!overdue.length ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhum inquilino em atraso! 🎉</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {overdue.map((t) => {
            const { fee, interest, total } = calcFees(Number(t.rent_amount));
            return (
              <Card key={t.id}>
                <CardContent className="pt-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.property?.address} - Casa {t.house_number}</p>
                      <div className="flex gap-3 mt-1 text-xs">
                        <span>Original: R$ {Number(t.rent_amount).toFixed(2)}</span>
                        <span>Multa (2%): R$ {fee.toFixed(2)}</span>
                        <span>Juros (1%): R$ {interest.toFixed(2)}</span>
                        <Badge variant="destructive">Total: R$ {total.toFixed(2)}</Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => markPaid(t.id, total)}><Check className="mr-1 h-3 w-3" />Pago</Button>
                      <Button size="sm" variant="outline" onClick={() => sendOverdueWhatsApp(t)}><MessageCircle className="mr-1 h-3 w-3" />Cobrar</Button>
                      <Button size="sm" variant="ghost" onClick={() => navigate(`/tenants/${t.id}`)}><Eye className="h-3 w-3" /></Button>
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

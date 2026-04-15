import { useState } from "react";
import { useTenants } from "@/hooks/use-tenants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { openWhatsApp, getMessageTemplates } from "@/lib/whatsapp";
import { toast } from "sonner";
import { Send, MessageCircle } from "lucide-react";

type TemplateKey = "reminder" | "overdue" | "expiring" | "confirmation" | "welcome" | "custom";

const TEMPLATE_LABELS: Record<TemplateKey, string> = {
  reminder: "Lembrete de aluguel",
  overdue: "Cobrança com multa/juros",
  expiring: "Aviso de vencimento de contrato",
  confirmation: "Confirmação de pagamento",
  welcome: "Boas-vindas",
  custom: "Mensagem personalizada",
};

export default function WhatsAppPage() {
  const { data: tenants } = useTenants("active");
  const [template, setTemplate] = useState<TemplateKey>("reminder");
  const [customMessage, setCustomMessage] = useState("");
  const [selectedTenants, setSelectedTenants] = useState<string[]>([]);
  const [mode, setMode] = useState<"individual" | "mass">("individual");
  const [singleTenant, setSingleTenant] = useState("");

  const now = new Date();

  const handleSend = () => {
    const targets = mode === "individual" ? [singleTenant] : selectedTenants;
    if (!targets.length) { toast.error("Selecione pelo menos um inquilino."); return; }

    let sent = 0;
    for (const id of targets) {
      const t = tenants?.find((x) => x.id === id);
      if (!t?.phone) continue;

      let message = customMessage;
      if (template !== "custom") {
        const templates = getMessageTemplates({
          name: t.name, amount: Number(t.rent_amount),
          month: now.getMonth() + 1, year: now.getFullYear(),
          property: t.property?.address || "", houseNumber: t.house_number || "",
          dueDay: t.payment_day || 10,
        });
        message = templates[template as keyof typeof templates] || customMessage;
      }

      if (message) { openWhatsApp({ phone: t.phone, message }); sent++; }
    }
    toast.success(`WhatsApp aberto para ${sent} inquilino(s).`);
  };

  const toggleTenant = (id: string) => {
    setSelectedTenants((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const selectAll = () => {
    const withPhone = tenants?.filter((t) => t.phone)?.map((t) => t.id) || [];
    setSelectedTenants(withPhone);
  };

  const tenant = tenants?.find((t) => t.id === singleTenant);
  const previewMessage = template !== "custom" && tenant
    ? getMessageTemplates({
        name: tenant.name, amount: Number(tenant.rent_amount),
        month: now.getMonth() + 1, year: now.getFullYear(),
        property: tenant.property?.address || "", houseNumber: tenant.house_number || "",
        dueDay: tenant.payment_day || 10,
      })[template as keyof ReturnType<typeof getMessageTemplates>] || ""
    : customMessage;

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">WhatsApp</h1>

      <div className="flex gap-2">
        <Button variant={mode === "individual" ? "default" : "outline"} onClick={() => setMode("individual")}>Individual</Button>
        <Button variant={mode === "mass" ? "default" : "outline"} onClick={() => setMode("mass")}>Em Massa</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">{mode === "individual" ? "Selecionar Inquilino" : "Selecionar Inquilinos"}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {mode === "individual" ? (
              <Select value={singleTenant} onValueChange={setSingleTenant}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{tenants?.filter((t) => t.phone).map((t) => <SelectItem key={t.id} value={t.id}>{t.name} - {t.phone}</SelectItem>)}</SelectContent>
              </Select>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={selectAll}>Selecionar todos com telefone</Button>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {tenants?.map((t) => (
                    <label key={t.id} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={selectedTenants.includes(t.id)} onCheckedChange={() => toggleTenant(t.id)} disabled={!t.phone} />
                      <span className={!t.phone ? "text-muted-foreground" : ""}>{t.name} {!t.phone && "(sem tel.)"}</span>
                    </label>
                  ))}
                </div>
              </>
            )}

            <div>
              <Label>Modelo de Mensagem</Label>
              <Select value={template} onValueChange={(v) => setTemplate(v as TemplateKey)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(TEMPLATE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {template === "custom" && (
              <div>
                <Label>Mensagem</Label>
                <Textarea value={customMessage} onChange={(e) => setCustomMessage(e.target.value)} placeholder="Digite sua mensagem..." rows={4} />
              </div>
            )}

            <Button className="w-full" onClick={handleSend}><Send className="mr-2 h-4 w-4" />Enviar via WhatsApp</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><MessageCircle className="h-5 w-5" />Pré-visualização</CardTitle></CardHeader>
          <CardContent>
            <div className="bg-muted rounded-lg p-4 text-sm whitespace-pre-wrap min-h-[200px]">
              {previewMessage || "Selecione um inquilino e modelo para ver a prévia."}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

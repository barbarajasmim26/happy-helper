import { useState } from "react";
import { useTenants, useProperties } from "@/hooks/use-tenants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { generateReceipt, type ReceiptData } from "@/lib/receipt-generator";
import { toast } from "sonner";
import { FileText, Printer, Download } from "lucide-react";

const MONTHS_PT = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export default function ReceiptPage() {
  const { data: tenants } = useTenants("active");
  const [selectedTenant, setSelectedTenant] = useState("");
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [paymentMethod, setPaymentMethod] = useState("Pix");
  const [customAmount, setCustomAmount] = useState("");

  const tenant = tenants?.find((t) => t.id === selectedTenant);

  const handleGenerate = () => {
    if (!tenant) { toast.error("Selecione um inquilino."); return; }
    const data: ReceiptData = {
      tenantName: tenant.name, cpf: tenant.cpf || undefined,
      address: tenant.property?.address || "", houseNumber: tenant.house_number || undefined,
      amount: customAmount ? parseFloat(customAmount) : Number(tenant.rent_amount),
      month: parseInt(month), year: parseInt(year),
      paymentDate: new Date().toLocaleDateString("pt-BR"), paymentMethod,
    };
    const doc = generateReceipt(data);
    doc.save(`recibo_${tenant.name}_${MONTHS_PT[parseInt(month) - 1]}_${year}.pdf`);
    toast.success("Recibo gerado com sucesso!");
  };

  const handlePrint = () => {
    if (!tenant) { toast.error("Selecione um inquilino."); return; }
    const data: ReceiptData = {
      tenantName: tenant.name, cpf: tenant.cpf || undefined,
      address: tenant.property?.address || "", houseNumber: tenant.house_number || undefined,
      amount: customAmount ? parseFloat(customAmount) : Number(tenant.rent_amount),
      month: parseInt(month), year: parseInt(year),
      paymentDate: new Date().toLocaleDateString("pt-BR"), paymentMethod,
    };
    const doc = generateReceipt(data);
    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <h1 className="text-2xl font-bold">Gerar Recibo</h1>
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div>
            <Label>Inquilino</Label>
            <Select value={selectedTenant} onValueChange={setSelectedTenant}>
              <SelectTrigger><SelectValue placeholder="Selecione o inquilino" /></SelectTrigger>
              <SelectContent>{tenants?.map((t) => <SelectItem key={t.id} value={t.id}>{t.name} - Casa {t.house_number}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {tenant && (
            <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
              <p><strong>Endereço:</strong> {tenant.property?.address} - Casa {tenant.house_number}</p>
              <p><strong>Aluguel:</strong> R$ {Number(tenant.rent_amount).toFixed(2)}</p>
              {tenant.cpf && <p><strong>CPF:</strong> {tenant.cpf}</p>}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Mês</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MONTHS_PT.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ano</Label>
              <Input type="number" value={year} onChange={(e) => setYear(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Valor (deixe vazio para usar o aluguel)</Label>
            <Input type="number" placeholder={tenant ? `R$ ${Number(tenant.rent_amount).toFixed(2)}` : ""} value={customAmount} onChange={(e) => setCustomAmount(e.target.value)} />
          </div>
          <div>
            <Label>Forma de Pagamento</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Pix">Pix</SelectItem>
                <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                <SelectItem value="Transferência">Transferência</SelectItem>
                <SelectItem value="Cartão">Cartão</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-3">
            <Button className="flex-1" onClick={handleGenerate}><Download className="mr-2 h-4 w-4" />Baixar PDF</Button>
            <Button variant="outline" className="flex-1" onClick={handlePrint}><Printer className="mr-2 h-4 w-4" />Imprimir</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

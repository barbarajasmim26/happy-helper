import { useState, useMemo } from "react";
import { useTenants, useProperties } from "@/hooks/use-tenants";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { generateReceipt, type ReceiptData, amountInWords } from "@/lib/receipt-generator";
import { toast } from "sonner";
import { Printer, Download, Receipt } from "lucide-react";
import logoMesquita from "@/assets/logo-mesquita.png";
import signatureImg from "@/assets/signature.png";

const MONTHS_PT = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const LOCADOR = {
  name: "MARIA ENEIDE DA SILVA",
  nationality: "brasileira",
  maritalStatus: "união estável",
  profession: "comerciante",
  cpf: "322.633.763-72",
  address: "Avenida Nova Fortaleza, 1391, Planalto Ayrton Senna, Fortaleza/CE, CEP: 61.930-350",
};

export default function ReceiptPage() {
  const { data: tenants } = useTenants("active");
  const { data: properties } = useProperties();
  const [selectedProperty, setSelectedProperty] = useState("all");
  const [selectedTenant, setSelectedTenant] = useState("");
  const [paymentType, setPaymentType] = useState("Aluguel");
  const [customAmount, setCustomAmount] = useState("");
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [emissionDate, setEmissionDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentMethod, setPaymentMethod] = useState("via pix");

  const filteredTenants = useMemo(() => {
    if (!tenants) return [];
    if (selectedProperty === "all") return tenants;
    return tenants.filter((t) => t.property_id === selectedProperty);
  }, [tenants, selectedProperty]);

  const tenant = tenants?.find((t) => t.id === selectedTenant);
  const amount = customAmount ? parseFloat(customAmount) : Number(tenant?.rent_amount || 0);
  const monthName = MONTHS_PT[parseInt(month) - 1] || "";

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr + "T12:00:00");
    return `Cascavel/CE, ${d.getDate()} de ${MONTHS_PT[d.getMonth()].toLowerCase()} de ${d.getFullYear()}.`;
  };

  const handleDownload = async () => {
    if (!tenant) { toast.error("Selecione um inquilino."); return; }
    const data: ReceiptData = {
      tenantName: tenant.name, cpf: tenant.cpf || undefined,
      address: tenant.property?.address || "", houseNumber: tenant.house_number || undefined,
      amount, month: parseInt(month), year: parseInt(year),
      paymentDate: emissionDate, paymentMethod, paymentType,
    };
    const doc = await generateReceipt(data);
    doc.save(`recibo_${tenant.name}_${monthName}_${year}.pdf`);
    toast.success("Recibo baixado!");
  };

  const handlePrint = async () => {
    if (!tenant) { toast.error("Selecione um inquilino."); return; }
    const data: ReceiptData = {
      tenantName: tenant.name, cpf: tenant.cpf || undefined,
      address: tenant.property?.address || "", houseNumber: tenant.house_number || undefined,
      amount, month: parseInt(month), year: parseInt(year),
      paymentDate: emissionDate, paymentMethod, paymentType,
    };
    const doc = await generateReceipt(data);
    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Receipt className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Emissão de Recibo</h1>
            <p className="text-sm text-muted-foreground">Gere e salve recibos profissionais</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownload}><Download className="mr-2 h-4 w-4" />Salvar PDF</Button>
          <Button onClick={handlePrint}><Printer className="mr-2 h-4 w-4" />Imprimir Recibo</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Form */}
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">1. Selecionar Inquilino</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-bold text-muted-foreground uppercase">Propriedade</Label>
                  <Select value={selectedProperty} onValueChange={(v) => { setSelectedProperty(v); setSelectedTenant(""); }}>
                    <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {properties?.map((p) => <SelectItem key={p.id} value={p.id}>{p.address}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-bold text-muted-foreground uppercase">Inquilino</Label>
                  <Select value={selectedTenant} onValueChange={setSelectedTenant}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>{filteredTenants.map((t) => <SelectItem key={t.id} value={t.id}>{t.name} - Casa {t.house_number}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">2. Dados do Pagamento</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-bold text-muted-foreground uppercase">Tipo</Label>
                  <Select value={paymentType} onValueChange={setPaymentType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Aluguel">Aluguel</SelectItem>
                      <SelectItem value="Caução">Caução</SelectItem>
                      <SelectItem value="Outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-bold text-muted-foreground uppercase">Valor (R$)</Label>
                  <Input type="number" placeholder={tenant ? Number(tenant.rent_amount).toFixed(2) : "0,00"} value={customAmount} onChange={(e) => setCustomAmount(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-bold text-muted-foreground uppercase">Mês Ref.</Label>
                  <Select value={month} onValueChange={setMonth}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{MONTHS_PT.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-bold text-muted-foreground uppercase">Ano Ref.</Label>
                  <Input type="number" value={year} onChange={(e) => setYear(e.target.value)} />
                </div>
              </div>
              <div>
                <Label className="text-xs font-bold text-muted-foreground uppercase">Data de Emissão</Label>
                <Input type="date" value={emissionDate} onChange={(e) => setEmissionDate(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs font-bold text-muted-foreground uppercase">Forma de Pagamento</Label>
                <Input value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Live Preview */}
        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Pré-visualização do Recibo</p>
          <div className="bg-white text-black border rounded-xl p-8 shadow-sm min-h-[600px] flex flex-col">
            {/* Logo */}
            <div className="flex justify-center mb-4">
              <img src={logoMesquita} alt="Mesquita Administração de Imóveis" className="h-14 object-contain" />
            </div>

            {/* Title */}
            <h3 className="text-center font-bold text-base mb-1">RECIBO DE PAGAMENTO DE ALUGUEL</h3>
            <div className="border-b border-black/30 mb-4" />

            {/* Locador */}
            <div className="text-[11px] leading-relaxed mb-3">
              <span className="font-bold">LOCADOR: </span>
              {LOCADOR.name}, {LOCADOR.nationality}, {LOCADOR.maritalStatus}, {LOCADOR.profession}, inscrita no CPF sob o n° {LOCADOR.cpf}, residente e domiciliada à {LOCADOR.address}.
            </div>

            {/* Locatário */}
            <div className="text-[11px] leading-relaxed mb-4">
              <span className="font-bold">LOCATÁRIO: </span>
              <span className="border-b border-black/30">{tenant?.name || "____________________________"}</span>
              {tenant?.cpf && <>, inscrito(a) no CPF sob o n° <span className="border-b border-black/30">{tenant.cpf}</span></>}
              , residente e domiciliado(a) em{" "}
              <span className="border-b border-black/30">
                {tenant?.property?.address ? `${tenant.property.address}${tenant.house_number ? `, Casa ${tenant.house_number}` : ""}` : "____________________________"}
              </span>.
            </div>

            <div className="border-b border-black/20 mb-4" />

            {/* Body */}
            <div className="text-xs leading-relaxed flex-1 space-y-3">
              <p>
                Recebi de <strong>{tenant?.name || "____________________________"}</strong>
                {tenant?.cpf && <>, CPF n° <strong>{tenant.cpf}</strong></>}
                , o valor de{" "}
                <strong>R$ {amount.toFixed(2)}</strong> ({amountInWords(amount)}),
                referente ao pagamento de {paymentType.toLowerCase()} do mês de {monthName.toLowerCase()} de {year}, do imóvel
                situado em{" "}
                <strong>
                  {tenant?.property?.address ? `${tenant.property.address}${tenant.house_number ? `, Casa ${tenant.house_number}` : ""}` : "____________________________"}
                </strong>.
              </p>

              <p><strong>Forma de pagamento:</strong> {paymentMethod}</p>
            </div>

            {/* Date */}
            <p className="text-center text-xs mt-6 mb-6">{formatDate(emissionDate)}</p>

            {/* Signature - Locador */}
            <div className="flex flex-col items-center mb-6">
              <img src={signatureImg} alt="Assinatura" className="h-14 object-contain mb-0" />
              <div className="w-48 border-t border-black/40" />
              <p className="text-xs font-bold mt-1">LOCADOR</p>
            </div>

            {/* Signature - Locatário */}
            <div className="flex flex-col items-center">
              <div className="w-48 border-t border-black/40 mt-8" />
              <p className="text-xs font-bold mt-1">LOCATÁRIO</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

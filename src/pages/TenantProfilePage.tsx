import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTenant, usePayments, useUpdateTenant, useUpsertPayment } from "@/hooks/use-tenants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Edit, MessageCircle, Receipt, UserX, Upload } from "lucide-react";
import { toast } from "sonner";
import { openWhatsApp, getMessageTemplates } from "@/lib/whatsapp";
import { generateReceipt } from "@/lib/receipt-generator";
import { supabase } from "@/integrations/supabase/client";

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export default function TenantProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: tenant, isLoading } = useTenant(id!);
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const { data: payments } = usePayments(id, year);
  const updateTenant = useUpdateTenant();
  const upsertPayment = useUpsertPayment();
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>({});

  if (isLoading) return <p className="p-6 text-muted-foreground">Carregando...</p>;
  if (!tenant) return <p className="p-6">Inquilino não encontrado.</p>;

  const getPaymentStatus = (month: number) => {
    return payments?.find((p) => p.month === month)?.status || "pending";
  };

  const togglePayment = async (month: number) => {
    const current = getPaymentStatus(month);
    const newStatus = current === "paid" ? "pending" : "paid";
    try {
      await upsertPayment.mutateAsync({
        tenant_id: id!, month, year, status: newStatus,
        amount: Number(tenant.rent_amount),
        paid_at: newStatus === "paid" ? new Date().toISOString().split("T")[0] : null,
      });
      toast.success(newStatus === "paid" ? "Marcado como pago!" : "Marcado como pendente.");
    } catch (e: any) { toast.error(e.message); }
  };

  const handleEdit = () => {
    setEditForm({
      name: tenant.name, phone: tenant.phone || "", house_number: tenant.house_number || "",
      rent_amount: tenant.rent_amount, deposit: tenant.deposit || "", payment_day: tenant.payment_day || 10,
      entry_date: tenant.entry_date || "", exit_date: tenant.exit_date || "", cpf: tenant.cpf || "",
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    try {
      await updateTenant.mutateAsync({
        id: id!, name: editForm.name, phone: editForm.phone || null,
        house_number: editForm.house_number || null, rent_amount: parseFloat(editForm.rent_amount),
        deposit: editForm.deposit ? parseFloat(editForm.deposit) : null,
        payment_day: parseInt(editForm.payment_day) || 10,
        entry_date: editForm.entry_date || null, exit_date: editForm.exit_date || null, cpf: editForm.cpf || null,
      });
      toast.success("Salvo!");
      setEditOpen(false);
    } catch (e: any) { toast.error(e.message); }
  };

  const moveToFormer = async () => {
    if (!confirm("Mover para ex-inquilino?")) return;
    try {
      await updateTenant.mutateAsync({ id: id!, status: "former" });
      toast.success("Movido para ex-inquilinos.");
      navigate("/tenants");
    } catch (e: any) { toast.error(e.message); }
  };

  const sendWhatsApp = () => {
    if (!tenant.phone) { toast.error("Telefone não cadastrado."); return; }
    const templates = getMessageTemplates({
      name: tenant.name, amount: Number(tenant.rent_amount),
      month: new Date().getMonth() + 1, year: currentYear,
      property: tenant.property?.address || "", houseNumber: tenant.house_number || "",
      dueDay: tenant.payment_day || 10,
    });
    openWhatsApp({ phone: tenant.phone, message: templates.reminder });
  };

  const handleReceipt = async (month: number) => {
    const doc = await generateReceipt({
      tenantName: tenant.name, cpf: tenant.cpf || undefined,
      address: tenant.property?.address || "", houseNumber: tenant.house_number || undefined,
      amount: Number(tenant.rent_amount), month, year,
      paymentDate: new Date().toLocaleDateString("pt-BR"), paymentMethod: "Dinheiro/Pix",
    });
    doc.save(`recibo_${tenant.name}_${month}_${year}.pdf`);
    toast.success("Recibo gerado!");
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const path = `${id}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from("contracts").upload(path, file);
    if (error) { toast.error("Erro ao enviar arquivo."); return; }
    await supabase.from("documents").insert({ tenant_id: id!, file_name: file.name, file_url: path, file_type: "contract" });
    toast.success("Contrato enviado!");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Button variant="ghost" onClick={() => navigate(-1)}><ArrowLeft className="mr-2 h-4 w-4" />Voltar</Button>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={handleEdit}><Edit className="mr-1 h-4 w-4" />Editar</Button>
        <Button variant="outline" size="sm" onClick={sendWhatsApp}><MessageCircle className="mr-1 h-4 w-4" />WhatsApp</Button>
        <Button variant="outline" size="sm" onClick={moveToFormer}><UserX className="mr-1 h-4 w-4" />Ex-inquilino</Button>
        <label>
          <Button variant="outline" size="sm" asChild><span><Upload className="mr-1 h-4 w-4" />Upload Contrato</span></Button>
          <input type="file" accept=".pdf" className="hidden" onChange={handleUpload} />
        </label>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{tenant.name}</CardTitle>
          <p className="text-sm text-muted-foreground">{tenant.property?.address} - Casa {tenant.house_number}</p>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><span className="text-muted-foreground">Aluguel</span><p className="font-semibold">R$ {Number(tenant.rent_amount).toFixed(2)}</p></div>
          <div><span className="text-muted-foreground">Caução</span><p className="font-semibold">R$ {Number(tenant.deposit || 0).toFixed(2)}</p></div>
          <div><span className="text-muted-foreground">Vencimento</span><p className="font-semibold">Dia {tenant.payment_day}</p></div>
          <div><span className="text-muted-foreground">Status</span><Badge variant={tenant.status === "active" ? "default" : "secondary"}>{tenant.status === "active" ? "Ativo" : "Encerrado"}</Badge></div>
          {tenant.entry_date && <div><span className="text-muted-foreground">Entrada</span><p>{new Date(tenant.entry_date).toLocaleDateString("pt-BR")}</p></div>}
          {tenant.exit_date && <div><span className="text-muted-foreground">Saída</span><p>{new Date(tenant.exit_date).toLocaleDateString("pt-BR")}</p></div>}
          {tenant.cpf && <div><span className="text-muted-foreground">CPF</span><p>{tenant.cpf}</p></div>}
          {tenant.phone && <div><span className="text-muted-foreground">Telefone</span><p>{tenant.phone}</p></div>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Histórico de Pagamentos</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setYear(year - 1)}>← {year - 1}</Button>
            <span className="text-sm font-bold flex items-center">{year}</span>
            <Button variant="outline" size="sm" onClick={() => setYear(year + 1)}>{year + 1} →</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2">
            {MONTHS.map((m, i) => {
              const status = getPaymentStatus(i + 1);
              return (
                <div key={m} className="text-center space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">{m}</p>
                  <Button
                    variant="outline" size="sm"
                    className={`w-full text-xs ${status === "paid" ? "bg-success/10 text-success border-success/30" : status === "deposit" ? "bg-primary/10 text-primary border-primary/30" : "bg-destructive/10 text-destructive border-destructive/30"}`}
                    onClick={() => togglePayment(i + 1)}
                  >
                    {status === "paid" ? "Pago" : status === "deposit" ? "Caução" : "Pend."}
                  </Button>
                  {status === "paid" && (
                    <Button variant="ghost" size="sm" className="w-full text-xs p-0 h-6" onClick={() => handleReceipt(i + 1)}>
                      <Receipt className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar Inquilino</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome</Label><Input value={editForm.name || ""} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></div>
            <div><Label>CPF</Label><Input value={editForm.cpf || ""} onChange={(e) => setEditForm({ ...editForm, cpf: e.target.value })} /></div>
            <div><Label>Telefone</Label><Input value={editForm.phone || ""} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} /></div>
            <div><Label>Casa</Label><Input value={editForm.house_number || ""} onChange={(e) => setEditForm({ ...editForm, house_number: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Aluguel</Label><Input type="number" value={editForm.rent_amount || ""} onChange={(e) => setEditForm({ ...editForm, rent_amount: e.target.value })} /></div>
              <div><Label>Caução</Label><Input type="number" value={editForm.deposit || ""} onChange={(e) => setEditForm({ ...editForm, deposit: e.target.value })} /></div>
            </div>
            <div><Label>Dia Pagamento</Label><Input type="number" value={editForm.payment_day || ""} onChange={(e) => setEditForm({ ...editForm, payment_day: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Entrada</Label><Input type="date" value={editForm.entry_date || ""} onChange={(e) => setEditForm({ ...editForm, entry_date: e.target.value })} /></div>
              <div><Label>Saída</Label><Input type="date" value={editForm.exit_date || ""} onChange={(e) => setEditForm({ ...editForm, exit_date: e.target.value })} /></div>
            </div>
            <Button className="w-full" onClick={saveEdit} disabled={updateTenant.isPending}>Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTenant, usePayments, useUpdateTenant, useUpsertPayment, useProperties, useAllPayments } from "@/hooks/use-tenants";
import { useDocuments } from "@/hooks/use-documents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Edit, MessageCircle, Receipt, UserX, Upload, FileText, ExternalLink, Phone, DollarSign, Calendar, MapPin, User, TrendingUp, TrendingDown, AlertTriangle, StickyNote } from "lucide-react";
import { toast } from "sonner";
import { openWhatsApp, openWhatsAppChat, getMessageTemplates } from "@/lib/whatsapp";
import { generateReceipt } from "@/lib/receipt-generator";
import { extractSupabaseStoragePath, isAbsoluteHttpUrl } from "@/lib/document-url";
import { supabase } from "@/integrations/supabase/client";

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export default function TenantProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: tenant, isLoading } = useTenant(id!);
  const { data: properties } = useProperties();
  const { data: documents, refetch: refetchDocs } = useDocuments(id);
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const { data: payments } = usePayments(id, year);
  const { data: allPayments } = useAllPayments(currentYear);
  const updateTenant = useUpdateTenant();
  const upsertPayment = useUpsertPayment();
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [notesOpen, setNotesOpen] = useState(false);
  const [notesValue, setNotesValue] = useState("");

  const now = new Date();
  const month = now.getMonth() + 1;

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );
  if (!tenant) return <p className="p-6">Inquilino não encontrado.</p>;

  // Payment pattern
  const getPaymentPattern = () => {
    if (!allPayments) return null;
    const recentPayments: boolean[] = [];
    for (let m = month - 1; m >= Math.max(1, month - 6); m--) {
      const p = allPayments.find((pay: any) => pay.tenant_id === id && pay.month === m);
      recentPayments.push(p?.status === "paid");
    }
    const paidCount = recentPayments.filter(Boolean).length;
    const total = recentPayments.length;
    if (total === 0) return null;
    const ratio = paidCount / total;
    if (ratio >= 0.8) return { label: "Paga e mora", icon: TrendingUp, colorClass: "bg-success/10 text-success border-success/30", desc: "Costuma pagar em dia, atraso pontual" };
    if (ratio <= 0.3) return { label: "Mora e paga", icon: TrendingDown, colorClass: "bg-destructive/10 text-destructive border-destructive/30", desc: "Atrasos frequentes" };
    return { label: "Irregular", icon: AlertTriangle, colorClass: "bg-warning/10 text-warning border-warning/30", desc: "Pagamento instável" };
  };

  const pattern = getPaymentPattern();

  const getPaymentStatus = (m: number) => {
    return payments?.find((p) => p.month === m)?.status || "pending";
  };

  const togglePayment = async (m: number) => {
    const current = getPaymentStatus(m);
    const newStatus = current === "paid" ? "pending" : "paid";
    try {
      await upsertPayment.mutateAsync({
        tenant_id: id!, month: m, year, status: newStatus,
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
      property_id: tenant.property_id || "", notes: tenant.notes || "",
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
        entry_date: editForm.entry_date || null, exit_date: editForm.exit_date || null,
        cpf: editForm.cpf || null, property_id: editForm.property_id || null,
        notes: editForm.notes || null,
      });
      toast.success("Salvo!");
      setEditOpen(false);
    } catch (e: any) { toast.error(e.message); }
  };

  const openNotesDialog = () => {
    setNotesValue(tenant.notes || "");
    setNotesOpen(true);
  };

  const saveNotes = async () => {
    try {
      await updateTenant.mutateAsync({ id: id!, notes: notesValue || null });
      toast.success("Observações salvas!");
      setNotesOpen(false);
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

  const openWhatsAppDirect = () => {
    if (!tenant.phone) { toast.error("Telefone não cadastrado."); return; }
    openWhatsAppChat(tenant.phone);
  };

  const handleReceipt = async (m: number) => {
    const doc = await generateReceipt({
      tenantName: tenant.name,
      cpf: tenant.cpf || undefined,
      address: tenant.property?.address || "",
      houseNumber: tenant.house_number || undefined,
      amount: Number(tenant.rent_amount),
      month: m,
      year,
      paymentDate: new Date().toISOString().split("T")[0],
      paymentMethod: "Pix",
      receiptNumber: `REC-${year}-${String(m).padStart(2, "0")}-${tenant.id.slice(0, 6).toUpperCase()}`,
      signatureName: "LOCADOR",
    });
    doc.save(`recibo_${tenant.name}_${m}_${year}.pdf`);
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
    refetchDocs();
  };

  const downloadDocument = async (doc: any) => {
    const storagePath = extractSupabaseStoragePath(doc.file_url || "");
    if (storagePath) {
      const { data, error } = await supabase.storage.from("contracts").createSignedUrl(storagePath, 3600);
      if (data?.signedUrl) { window.open(data.signedUrl, "_blank", "noopener,noreferrer"); return; }
      if (error) console.error("Erro ao gerar URL assinada:", error);
    }
    if (isAbsoluteHttpUrl(doc.file_url || "")) { window.open(doc.file_url, "_blank", "noopener,noreferrer"); return; }
    toast.error("Erro ao abrir documento.");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Button variant="ghost" onClick={() => navigate(-1)} className="rounded-lg">
        <ArrowLeft className="mr-2 h-4 w-4" />Voltar
      </Button>

      {/* Profile Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary font-bold text-xl">
                {tenant.name.charAt(0)}
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">{tenant.name}</h1>
                <p className="text-sm text-muted-foreground">{tenant.property?.address} - Casa {tenant.house_number}</p>
                <div className="flex gap-2 mt-2 flex-wrap">
                  <Badge variant={tenant.status === "active" ? "default" : "secondary"} className="rounded-lg">
                    {tenant.status === "active" ? "✓ Ativo" : "Encerrado"}
                  </Badge>
                  {pattern && (
                    <Badge variant="outline" className={`rounded-lg ${pattern.colorClass}`}>
                      <pattern.icon className="h-3 w-3 mr-1" />{pattern.label}
                    </Badge>
                  )}
                </div>
                {pattern?.desc && <p className="text-xs text-muted-foreground mt-1 italic">{pattern.desc}</p>}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleEdit} className="rounded-lg">
                <Edit className="mr-1 h-4 w-4" />Editar
              </Button>
              <Button variant="outline" size="sm" onClick={openNotesDialog} className="rounded-lg">
                <StickyNote className="mr-1 h-4 w-4" />OBS
              </Button>
              <Button variant="outline" size="sm" onClick={sendWhatsApp} className="rounded-lg">
                <MessageCircle className="mr-1 h-4 w-4" />WhatsApp
              </Button>
              {tenant.phone && (
                <Button variant="outline" size="sm" onClick={openWhatsAppDirect} className="rounded-lg">
                  <Phone className="mr-1 h-4 w-4" />Chat
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={moveToFormer} className="rounded-lg text-destructive hover:bg-destructive/10">
                <UserX className="mr-1 h-4 w-4" />Ex-inquilino
              </Button>
              <label>
                <Button variant="outline" size="sm" asChild className="rounded-lg"><span><Upload className="mr-1 h-4 w-4" />Contrato</span></Button>
                <input type="file" accept=".pdf,.jpg,.png,.doc,.docx" className="hidden" onChange={handleUpload} />
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { icon: DollarSign, label: "Aluguel", value: `R$ ${Number(tenant.rent_amount).toFixed(2)}`, colorClass: "text-success" },
          { icon: DollarSign, label: "Caução", value: `R$ ${Number(tenant.deposit || 0).toFixed(2)}`, colorClass: "text-primary" },
          { icon: Calendar, label: "Vencimento", value: `Dia ${tenant.payment_day}`, colorClass: "text-primary" },
          { icon: Calendar, label: "Entrada", value: tenant.entry_date ? new Date(tenant.entry_date).toLocaleDateString("pt-BR") : "—", colorClass: "text-muted-foreground" },
          { icon: Calendar, label: "Saída", value: tenant.exit_date ? new Date(tenant.exit_date).toLocaleDateString("pt-BR") : "—", colorClass: "text-muted-foreground" },
          { icon: User, label: "CPF", value: tenant.cpf || "—", colorClass: "text-muted-foreground" },
        ].map((item, i) => (
          <Card key={i}>
            <CardContent className="pt-4 pb-3 text-center">
              <item.icon className={`h-4 w-4 mx-auto mb-1 ${item.colorClass}`} />
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="text-sm font-semibold mt-0.5">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Phone & Property */}
      {(tenant.phone || tenant.property) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {tenant.phone && (
            <Card className="cursor-pointer hover:shadow-md transition-all" onClick={openWhatsAppDirect}>
              <CardContent className="pt-4 pb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10 text-success">
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Telefone / WhatsApp</p>
                  <p className="text-sm font-semibold text-primary">{tenant.phone} <ExternalLink className="inline h-3 w-3" /></p>
                </div>
              </CardContent>
            </Card>
          )}
          {tenant.property && (
            <Card>
              <CardContent className="pt-4 pb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Condomínio</p>
                  <p className="text-sm font-semibold">{tenant.property.name || tenant.property.address}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Notes Section */}
      {tenant.notes && (
        <Card className="border-primary/20">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                <StickyNote className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Observações</p>
                <p className="text-sm text-foreground/80 whitespace-pre-wrap">{tenant.notes}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documents */}
      {documents && documents.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />Documentos / Contratos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm font-medium">{doc.file_name}</p>
                      <p className="text-xs text-muted-foreground">{new Date(doc.created_at).toLocaleDateString("pt-BR")}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => downloadDocument(doc)} className="rounded-lg">
                    <ExternalLink className="mr-1 h-3 w-3" />Abrir
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payments */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Histórico de Pagamentos</CardTitle>
          <div className="flex gap-2 items-center">
            <Button variant="outline" size="sm" onClick={() => setYear(year - 1)} className="rounded-lg">← {year - 1}</Button>
            <span className="text-sm font-bold">{year}</span>
            <Button variant="outline" size="sm" onClick={() => setYear(year + 1)} className="rounded-lg">{year + 1} →</Button>
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
                    className={`w-full text-xs rounded-lg ${status === "paid" ? "bg-success/10 text-success border-success/30 hover:bg-success/20" : status === "deposit" ? "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20" : "bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/20"}`}
                    onClick={() => togglePayment(i + 1)}
                  >
                    {status === "paid" ? "✓ Pago" : status === "deposit" ? "Caução" : "Pend."}
                  </Button>
                  {status === "paid" && (
                    <Button variant="ghost" size="sm" className="w-full text-xs p-0 h-6 rounded-lg" onClick={() => handleReceipt(i + 1)}>
                      <Receipt className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar Inquilino</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome</Label><Input value={editForm.name || ""} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></div>
            <div><Label>CPF</Label><Input value={editForm.cpf || ""} onChange={(e) => setEditForm({ ...editForm, cpf: e.target.value })} /></div>
            <div><Label>Telefone / WhatsApp</Label><Input value={editForm.phone || ""} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} /></div>
            <div>
              <Label>Condomínio / Propriedade</Label>
              <Select value={editForm.property_id || ""} onValueChange={(v) => setEditForm({ ...editForm, property_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione o condomínio" /></SelectTrigger>
                <SelectContent>
                  {properties?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name || p.address}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
            <div>
              <Label>Observações</Label>
              <Textarea value={editForm.notes || ""} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} placeholder="Anotações importantes..." rows={3} />
            </div>
            <Button className="w-full rounded-xl" onClick={saveEdit} disabled={updateTenant.isPending}>Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Notes Dialog */}
      <Dialog open={notesOpen} onOpenChange={setNotesOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><StickyNote className="h-5 w-5 text-primary" />Observações</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Textarea value={notesValue} onChange={(e) => setNotesValue(e.target.value)} placeholder="Anotações sobre o inquilino, imóvel ou contrato..." rows={6} />
            <Button className="w-full rounded-xl" onClick={saveNotes} disabled={updateTenant.isPending}>
              {updateTenant.isPending ? "Salvando..." : "Salvar Observações"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

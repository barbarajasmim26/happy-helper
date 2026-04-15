import { useState } from "react";
import { useTenants, useCreateTenant, useProperties } from "@/hooks/use-tenants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function TenantsPage() {
  const { data: tenants, isLoading } = useTenants("active");
  const { data: properties } = useProperties();
  const createTenant = useCreateTenant();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", phone: "", house_number: "", rent_amount: "", deposit: "",
    payment_day: "10", entry_date: "", exit_date: "", property_id: "", cpf: "",
  });

  const filtered = tenants?.filter((t) => {
    const q = search.toLowerCase();
    return t.name.toLowerCase().includes(q) || t.house_number?.toLowerCase().includes(q) || t.property?.address?.toLowerCase().includes(q);
  });

  const handleCreate = async () => {
    if (!form.name || !form.rent_amount) { toast.error("Nome e valor são obrigatórios"); return; }
    try {
      await createTenant.mutateAsync({
        name: form.name, phone: form.phone || null, house_number: form.house_number || null,
        rent_amount: parseFloat(form.rent_amount), deposit: form.deposit ? parseFloat(form.deposit) : null,
        payment_day: parseInt(form.payment_day) || 10, entry_date: form.entry_date || null,
        exit_date: form.exit_date || null, property_id: form.property_id || null, cpf: form.cpf || null,
        status: "active",
      });
      toast.success("Inquilino criado!");
      setOpen(false);
      setForm({ name: "", phone: "", house_number: "", rent_amount: "", deposit: "", payment_day: "10", entry_date: "", exit_date: "", property_id: "", cpf: "" });
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Contratos Ativos</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Novo Inquilino</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Novo Inquilino</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nome completo *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>CPF</Label><Input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} /></div>
              <div><Label>Telefone / WhatsApp</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label>Imóvel</Label>
                <Select value={form.property_id} onValueChange={(v) => setForm({ ...form, property_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{properties?.map((p) => <SelectItem key={p.id} value={p.id}>{p.address}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Nº da Casa</Label><Input value={form.house_number} onChange={(e) => setForm({ ...form, house_number: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Aluguel (R$) *</Label><Input type="number" value={form.rent_amount} onChange={(e) => setForm({ ...form, rent_amount: e.target.value })} /></div>
                <div><Label>Caução (R$)</Label><Input type="number" value={form.deposit} onChange={(e) => setForm({ ...form, deposit: e.target.value })} /></div>
              </div>
              <div><Label>Dia do Pagamento</Label><Input type="number" min={1} max={31} value={form.payment_day} onChange={(e) => setForm({ ...form, payment_day: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Data de Entrada</Label><Input type="date" value={form.entry_date} onChange={(e) => setForm({ ...form, entry_date: e.target.value })} /></div>
                <div><Label>Data de Saída</Label><Input type="date" value={form.exit_date} onChange={(e) => setForm({ ...form, exit_date: e.target.value })} /></div>
              </div>
              <Button className="w-full" onClick={handleCreate} disabled={createTenant.isPending}>
                {createTenant.isPending ? "Salvando..." : "Criar Inquilino"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por nome, casa ou endereço..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {isLoading ? <p className="text-muted-foreground">Carregando...</p> : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered?.map((t) => (
            <Card key={t.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/tenants/${t.id}`)}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t.name}</CardTitle>
                <p className="text-xs text-muted-foreground">{t.property?.address} - Casa {t.house_number}</p>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Aluguel</span>
                  <span className="font-semibold">R$ {Number(t.rent_amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-muted-foreground">Vencimento</span>
                  <span>Dia {t.payment_day}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

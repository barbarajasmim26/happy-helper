import { useState } from "react";
import { useTenants } from "@/hooks/use-tenants";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Phone, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function SearchPage() {
  const { data: tenants } = useTenants();
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const results = query.length >= 2
    ? tenants?.filter((t) => {
        const q = query.toLowerCase();
        return (
          t.name.toLowerCase().includes(q) ||
          t.house_number?.toLowerCase().includes(q) ||
          t.property?.address?.toLowerCase().includes(q) ||
          t.phone?.replace(/\D/g, "").includes(q.replace(/\D/g, "")) ||
          t.cpf?.replace(/\D/g, "").includes(q.replace(/\D/g, ""))
        );
      })
    : [];

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Busca Rápida</h1>
        <p className="text-sm text-muted-foreground">Busque por nome, endereço, casa, telefone ou CPF</p>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input placeholder="Digite para buscar..." className="pl-12 h-12 text-lg rounded-xl" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
      </div>
      {results && results.length > 0 && (
        <div className="space-y-2">
          {results.map((t) => (
            <Card key={t.id} className="cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5" onClick={() => navigate(`/tenants/${t.id}`)}>
              <CardContent className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.property?.address} - Casa {t.house_number}</p>
                    <div className="flex gap-2 mt-1">
                      {t.phone && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Phone className="h-3 w-3" />{t.phone}</span>}
                      {t.cpf && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><User className="h-3 w-3" />{t.cpf}</span>}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">R$ {Number(t.rent_amount).toFixed(2)}</p>
                  <Badge variant={t.status === "active" ? "default" : "secondary"} className="text-[10px]">
                    {t.status === "active" ? "Ativo" : "Ex-inquilino"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {query.length >= 2 && results?.length === 0 && (
        <p className="text-muted-foreground text-center py-8">Nenhum resultado encontrado.</p>
      )}
    </div>
  );
}

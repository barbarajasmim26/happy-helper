import { useState } from "react";
import { useTenants } from "@/hooks/use-tenants";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function SearchPage() {
  const { data: tenants } = useTenants();
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const results = query.length >= 2
    ? tenants?.filter((t) => {
        const q = query.toLowerCase();
        return t.name.toLowerCase().includes(q) || t.house_number?.toLowerCase().includes(q) || t.property?.address?.toLowerCase().includes(q);
      })
    : [];

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <h1 className="text-2xl font-bold">Busca Rápida</h1>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input placeholder="Buscar por nome, endereço ou casa..." className="pl-12 h-12 text-lg" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
      </div>
      {results && results.length > 0 && (
        <div className="space-y-2">
          {results.map((t) => (
            <Card key={t.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/tenants/${t.id}`)}>
              <CardContent className="py-3">
                <p className="font-medium">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.property?.address} - Casa {t.house_number} | R$ {Number(t.rent_amount).toFixed(2)} | {t.status === "active" ? "Ativo" : "Ex-inquilino"}</p>
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

import { useTenants, useUpdateTenant } from "@/hooks/use-tenants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";

export default function FormerTenantsPage() {
  const { data: tenants, isLoading } = useTenants("former");
  const updateTenant = useUpdateTenant();
  const navigate = useNavigate();

  const reactivate = async (id: string) => {
    try {
      await updateTenant.mutateAsync({ id, status: "active" });
      toast.success("Inquilino reativado!");
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">Ex-Inquilinos</h1>
      {isLoading ? <p className="text-muted-foreground">Carregando...</p> : !tenants?.length ? (
        <p className="text-muted-foreground">Nenhum ex-inquilino.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {tenants.map((t) => (
            <Card key={t.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t.name}</CardTitle>
                <p className="text-xs text-muted-foreground">{t.property?.address} - Casa {t.house_number}</p>
              </CardHeader>
              <CardContent className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => navigate(`/tenants/${t.id}`)}>Ver perfil</Button>
                <Button variant="outline" size="sm" onClick={() => reactivate(t.id)}><RotateCcw className="mr-1 h-3 w-3" />Reativar</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

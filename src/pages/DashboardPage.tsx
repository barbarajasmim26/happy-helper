import { useDashboardStats, useTenants } from "@/hooks/use-tenants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Users, DollarSign, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function DashboardPage() {
  const { data: stats, isLoading } = useDashboardStats();
  const { data: tenants } = useTenants("active");
  const navigate = useNavigate();

  const cards = [
    { label: "Total de Contratos", value: stats?.totalContracts || 0, icon: FileText, color: "text-primary", link: "/tenants" },
    { label: "Contratos Ativos", value: stats?.activeContracts || 0, icon: Users, color: "text-success", link: "/tenants" },
    { label: "Receita Mensal", value: `R$ ${(stats?.monthlyRevenue || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, icon: DollarSign, color: "text-success", link: "/reports" },
    { label: "Pendente", value: `R$ ${(stats?.pendingAmount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, icon: AlertTriangle, color: "text-warning", link: "/overdue" },
  ];

  if (isLoading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Card key={card.label} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(card.link)}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Inquilinos Ativos</CardTitle>
        </CardHeader>
        <CardContent>
          {!tenants?.length ? (
            <p className="text-muted-foreground text-sm">Nenhum inquilino ativo.</p>
          ) : (
            <div className="space-y-2">
              {tenants.slice(0, 10).map((t) => (
                <div key={t.id} className="flex items-center justify-between py-2 border-b last:border-0 cursor-pointer hover:bg-muted/50 rounded px-2 -mx-2" onClick={() => navigate(`/tenants/${t.id}`)}>
                  <div>
                    <p className="font-medium text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.property?.address} - Casa {t.house_number}</p>
                  </div>
                  <span className="text-sm font-semibold">R$ {Number(t.rent_amount).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

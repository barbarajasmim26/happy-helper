import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useDocuments(tenantId?: string) {
  return useQuery({
    queryKey: ["documents", tenantId],
    queryFn: async () => {
      let query = supabase.from("documents").select("*").order("created_at", { ascending: false });
      if (tenantId) query = query.eq("tenant_id", tenantId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });
}

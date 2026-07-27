import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiClient } from "@/lib/api-client";

export function useMigrationsDashboard() {
  return useQuery({
    queryKey: ["migrations-dashboard"],
    queryFn: () => ApiClient.get("/migrations/dashboard"),
    refetchInterval: 30000,
  });
}

export function useMigrationHistory(id: string) {
  return useQuery({
    queryKey: ["migration-history", id],
    queryFn: () => ApiClient.get(`/migrations/${id}/history`),
    enabled: !!id,
  });
}

export function useExecuteMigration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ApiClient.post(`/migrations/${id}/execute`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["migrations-dashboard"] });
    },
  });
}

export function useRollbackMigration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ApiClient.post(`/migrations/${id}/rollback`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["migrations-dashboard"] });
    },
  });
}

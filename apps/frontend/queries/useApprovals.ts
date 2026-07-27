import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiClient } from "@/lib/api-client";

export function useApprovalsDashboard() {
  return useQuery({
    queryKey: ["approvals-dashboard"],
    queryFn: () => ApiClient.get("/approvals/dashboard"),
    refetchInterval: 30000,
  });
}

export function useApproveAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ApiClient.post(`/accounting-intelligence/approvals/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approvals-dashboard"] });
    },
  });
}

export function useRejectAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => 
      ApiClient.post(`/accounting-intelligence/approvals/${id}/reject`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approvals-dashboard"] });
    },
  });
}

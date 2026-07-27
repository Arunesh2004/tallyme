import { useQuery } from "@tanstack/react-query";
import { ApiClient } from "@/lib/api-client";

export function useDecisions() {
  return useQuery({
    queryKey: ["decisions"],
    queryFn: () => ApiClient.get("/decisions"),
  });
}

export function useDecision(id: string) {
  return useQuery({
    queryKey: ["decision", id],
    queryFn: () => ApiClient.get(`/decisions/${id}`),
    enabled: !!id,
  });
}

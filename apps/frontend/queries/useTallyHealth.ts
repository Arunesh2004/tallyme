import { useQuery } from "@tanstack/react-query";
import { ApiClient } from "@/lib/api-client";

export function useTallyHealth() {
  return useQuery({
    queryKey: ["tally-health"],
    queryFn: () => ApiClient.get("/tally/health"),
    refetchInterval: 15000,
  });
}

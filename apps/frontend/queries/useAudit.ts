import { useQuery } from "@tanstack/react-query";
import { ApiClient } from "@/lib/api-client";

export function useAuditTimeline(entityId: string) {
  return useQuery({
    queryKey: ["audit-timeline", entityId],
    queryFn: () => ApiClient.get(`/audit/timeline/${entityId}`),
    enabled: !!entityId,
  });
}

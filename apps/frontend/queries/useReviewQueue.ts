import { useQuery } from "@tanstack/react-query";
import { ApiClient } from "@/lib/api-client";

export function useReviewQueue() {
  return useQuery({
    queryKey: ["review-queue"],
    queryFn: () => ApiClient.get("/operations/review-queue"),
    refetchInterval: 30000,
  });
}

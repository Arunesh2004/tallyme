import { useQuery } from "@tanstack/react-query";
import { ApiClient } from "@/lib/api-client";

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [overviewData, operationsData] = await Promise.all([
        ApiClient.get("/dashboard/overview") as Promise<any>,
        ApiClient.get("/dashboard/operations") as Promise<any>
      ]);
      return {
        data: overviewData.data || overviewData,
        chartData: operationsData.data || operationsData
      };
    },
    refetchInterval: 30000,
  });
}

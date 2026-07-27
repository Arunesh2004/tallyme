import { useQuery } from "@tanstack/react-query";
import { TransactionService } from "@/services/transactions";

export function useTransactions(page = 1, limit = 10, search?: string, status?: string) {
  return useQuery<any>({
    queryKey: ["transactions", page, limit, search, status],
    queryFn: () => TransactionService.getTransactions(page, limit, search, status),
  });
}

export function useTransaction(id: string) {
  return useQuery<any>({
    queryKey: ["transactions", id],
    queryFn: () => TransactionService.getTransactionById(id),
    enabled: !!id,
  });
}

import { ApiClient } from "@/lib/api-client";

export const TransactionService = {
  getTransactions: async (page: number = 1, limit: number = 10, search?: string, status?: string) => {
    let url = `/operations/transactions?page=${page}&limit=${limit}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (status) url += `&status=${encodeURIComponent(status)}`;
    return ApiClient.get(url);
  },
  getTransactionById: async (id: string) => {
    return ApiClient.get(`/operations/transactions/${id}`);
  }
};

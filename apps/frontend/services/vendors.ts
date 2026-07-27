import { ApiClient } from "@/lib/api-client";

export const VendorService = {
  getVendors: async (page: number = 1, limit: number = 10, search?: string, gstin?: string) => {
    let url = `/operations/vendors?page=${page}&limit=${limit}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (gstin) url += `&gstin=${encodeURIComponent(gstin)}`;
    return ApiClient.get(url);
  },
  getVendorById: async (id: string) => {
    return ApiClient.get(`/operations/vendors/${id}`);
  }
};

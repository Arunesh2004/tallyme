import { useQuery } from "@tanstack/react-query";
import { VendorService } from "@/services/vendors";

export function useVendors(page = 1, limit = 10, search?: string, gstin?: string) {
  return useQuery<any>({
    queryKey: ["vendors", page, limit, search, gstin],
    queryFn: () => VendorService.getVendors(page, limit, search, gstin),
  });
}

export function useVendor(id: string) {
  return useQuery<any>({
    queryKey: ["vendors", id],
    queryFn: () => VendorService.getVendorById(id),
    enabled: !!id,
  });
}

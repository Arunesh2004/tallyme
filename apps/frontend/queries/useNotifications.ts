import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { NotificationService } from "@/services/notifications";

export function useNotifications(page = 1, limit = 20, status?: string) {
  return useQuery<any>({
    queryKey: ["notifications", page, limit, status],
    queryFn: () => NotificationService.getNotifications(page, limit, status),
  });
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => NotificationService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

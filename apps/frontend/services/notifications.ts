import { ApiClient } from "@/lib/api-client";

export const NotificationService = {
  getNotifications: async (page: number = 1, limit: number = 20, status?: string) => {
    let url = `/operations/notifications?page=${page}&limit=${limit}`;
    if (status) url += `&status=${encodeURIComponent(status)}`;
    return ApiClient.get(url);
  },
  markAsRead: async (id: string) => {
    return ApiClient.patch(`/operations/notifications/${id}/read`);
  }
};

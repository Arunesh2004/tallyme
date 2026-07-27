"use client";

import { useState } from "react";
import { useNotifications, useMarkNotificationAsRead } from "@/queries/useNotifications";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { format } from "date-fns";
import { Bell, CheckCircle2 } from "lucide-react";

export default function NotificationsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const limit = 20;

  const { data, isLoading, error } = useNotifications(page, limit, status);
  const markAsRead = useMarkNotificationAsRead();

  const handleMarkRead = (id: string) => {
    markAsRead.mutate(id);
  };

  const getStatusColor = (type: string) => {
    switch (type) {
      case 'SYNC_FAILED':
      case 'ROLLBACK_FAILED':
        return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'APPROVAL_REQUIRED':
      case 'LOW_CONFIDENCE_EXTRACTION':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/50';
      case 'MIGRATION_COMPLETED':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50';
      default:
        return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
    }
  };

  const unreadCount = data?.data?.filter((n: any) => n.status === 'UNREAD').length || 0;

  return (
    <ProtectedRoute>
      <div className="p-8 space-y-6 text-white bg-[#0A0A0A] min-h-screen">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                {unreadCount} New
              </span>
            )}
          </div>
          
          <select 
            className="bg-[#111] border border-[#333] text-sm px-4 py-2 rounded focus:outline-none focus:border-blue-500"
            value={status || ''}
            onChange={(e) => { setStatus(e.target.value || undefined); setPage(1); }}
          >
            <option value="">All Notifications</option>
            <option value="UNREAD">Unread Only</option>
            <option value="READ">Read Only</option>
          </select>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="h-20 bg-gray-800 rounded animate-pulse w-full"></div>
            ))}
          </div>
        ) : error ? (
          <div className="text-red-500">Failed to load notifications.</div>
        ) : (
          <div className="space-y-4">
            {data?.data?.map((notification: any) => (
              <div 
                key={notification.id} 
                className={`bg-[#111] border ${notification.status === 'UNREAD' ? 'border-[#444]' : 'border-[#222] opacity-70'} p-4 rounded-xl flex items-start justify-between transition-all`}
              >
                <div className="flex items-start gap-4">
                  <div className={`mt-1 p-2 rounded-full border ${getStatusColor(notification.type)}`}>
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#E5E5E5]">{notification.type.replace(/_/g, ' ')}</h3>
                    <p className="text-sm text-gray-400 mt-1">{notification.message}</p>
                    <p className="text-xs text-gray-500 mt-2">{format(new Date(notification.createdAt), 'PPp')}</p>
                  </div>
                </div>
                
                {notification.status === 'UNREAD' && (
                  <button 
                    onClick={() => handleMarkRead(notification.id)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-[#222] rounded transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Mark Read
                  </button>
                )}
              </div>
            ))}

            {data?.data?.length === 0 && (
              <div className="p-12 text-center border border-[#222] rounded-xl bg-[#111]">
                <Bell className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">You're all caught up!</p>
              </div>
            )}
            
            {/* Pagination Controls */}
            {data?.pagination && data.pagination.total > limit && (
              <div className="flex justify-between items-center text-sm pt-4">
                <span className="text-gray-500">Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, data.pagination.total)} of {data.pagination.total}</span>
                <div className="space-x-2">
                  <button 
                    disabled={page === 1} 
                    onClick={() => setPage(p => p - 1)}
                    className="px-3 py-1 bg-[#222] rounded hover:bg-[#333] disabled:opacity-50 transition-colors"
                  >
                    Previous
                  </button>
                  <button 
                    disabled={page * limit >= data.pagination.total} 
                    onClick={() => setPage(p => p + 1)}
                    className="px-3 py-1 bg-[#222] rounded hover:bg-[#333] disabled:opacity-50 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

// apps/web/app/dashboard/page.tsx
'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';

function fetchDashboardMetrics() {
  return apiClient.get('/admin/metrics').then(res => res.data);
}

export default function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: fetchDashboardMetrics,
    refetchInterval: 30000 // Polling
  });

  if (isLoading) return <div className="p-8 text-center text-gray-500">Loading metrics...</div>;
  if (error) return <div className="p-8 text-center text-red-500">Failed to load dashboard</div>;

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Enterprise Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric Cards */}
        <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 dark:bg-gray-800 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Vouchers Generated</h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">1,245</p>
        </div>
        
        <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 dark:bg-gray-800 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">ERP Sync Success Rate</h3>
          <p className="mt-2 text-3xl font-semibold text-green-600">99.8%</p>
        </div>

        <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 dark:bg-gray-800 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Manual Review Queue</h3>
          <p className="mt-2 text-3xl font-semibold text-orange-500">12</p>
        </div>

        <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 dark:bg-gray-800 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">BullMQ Active Workers</h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">5 / 5</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 min-h-[300px] flex items-center justify-center dark:bg-gray-800 dark:border-gray-700">
          <p className="text-gray-400">[Recharts Volume Trend Graph Placeholder]</p>
        </div>
        <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 min-h-[300px] flex items-center justify-center dark:bg-gray-800 dark:border-gray-700">
          <p className="text-gray-400">[System Health Timeline Placeholder]</p>
        </div>
      </div>
    </div>
  );
}

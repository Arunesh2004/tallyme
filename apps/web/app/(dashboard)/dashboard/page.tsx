import React from 'react';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Operations Dashboard</h1>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Today's Vouchers</p>
          <p className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">124</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Vendor Docs</p>
          <p className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">45</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Student Payments</p>
          <p className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">212</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5 border-l-4 border-yellow-500">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Pending Reviews</p>
          <p className="mt-1 text-3xl font-semibold text-yellow-600 dark:text-yellow-500">12</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Health */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5 col-span-1">
          <h2 className="text-lg font-medium mb-4">System Health</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Database</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Operational</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Tally ERP</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Connected</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">OCR Service</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Operational</span>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5 col-span-2">
          <h2 className="text-lg font-medium mb-4">Recent Activity</h2>
          <div className="space-y-4">
            <div className="flex space-x-3">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-blue-600 text-xs font-bold">ERP</span>
              </div>
              <div>
                <p className="text-sm text-gray-900 dark:text-gray-100">Successfully synced Voucher <span className="font-medium">RCT-2024-001</span> to Tally.</p>
                <p className="text-xs text-gray-500">2 minutes ago</p>
              </div>
            </div>
            <div className="flex space-x-3">
              <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center">
                <span className="text-yellow-600 text-xs font-bold">REV</span>
              </div>
              <div>
                <p className="text-sm text-gray-900 dark:text-gray-100">Vendor Slip matching confidence low. Manual review required.</p>
                <p className="text-xs text-gray-500">15 minutes ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

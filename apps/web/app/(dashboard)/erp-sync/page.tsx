import React from 'react';

export default function ERPSyncDashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">ERP Sync Dashboard</h1>
      
      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center border-t-4 border-gray-400">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Pending</p>
          <p className="mt-1 text-2xl font-semibold">0</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center border-t-4 border-blue-500">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Processing</p>
          <p className="mt-1 text-2xl font-semibold text-blue-600">2</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center border-t-4 border-yellow-500">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Retrying</p>
          <p className="mt-1 text-2xl font-semibold text-yellow-600">1</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center border-t-4 border-red-500">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Failed</p>
          <p className="mt-1 text-2xl font-semibold text-red-600">3</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center border-t-4 border-green-500">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Success</p>
          <p className="mt-1 text-2xl font-semibold text-green-600">1,245</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center border-t-4 border-purple-500">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Avg Time</p>
          <p className="mt-1 text-2xl font-semibold text-purple-600">1.2s</p>
        </div>
      </div>

      {/* Sync Jobs Table */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden flex flex-col">
        <div className="px-4 py-5 border-b border-gray-200 dark:border-gray-700 sm:px-6 flex justify-between items-center">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">Recent Sync Jobs</h3>
          <div className="flex space-x-2">
            <input type="text" placeholder="Search vouchers..." className="border rounded px-3 py-1 text-sm bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-600" />
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm">Filter</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Voucher</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attempts</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {/* Dummy Data Rows */}
              <tr>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">PAY-2024-055</div>
                  <div className="text-xs text-gray-500">Payment</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">TallyMe Demo Corp</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">FAILED_PERMANENT</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">5 / 5</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">2026-07-21 14:30</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button className="text-blue-600 hover:text-blue-900 mr-3">Retry</button>
                  <button className="text-gray-600 hover:text-gray-900">View XML</button>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">RCT-2024-112</div>
                  <div className="text-xs text-gray-500">Receipt</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">TallyMe Demo Corp</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">SYNCED</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">1 / 5</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">2026-07-21 15:10</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button className="text-gray-600 hover:text-gray-900">View XML</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

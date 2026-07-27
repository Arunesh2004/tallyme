'use client';

import React, { useEffect, useState } from 'react';

export default function QueuePage() {
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchVouchers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/vouchers');
      const data = await res.json();
      if (data.success) {
        setVouchers(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch vouchers', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchVouchers();
  }, []);

  const pushToTally = async (voucherId: string) => {
    try {
      await fetch(`/api/v1/vouchers/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voucherId })
      });
      fetchVouchers(); // Refresh the list
    } catch (err) {
      console.error(err);
      alert('Failed to push to Tally');
    }
  };

  const pushAllToTally = async () => {
    const pending = vouchers.filter(v => v.syncStatus === 'PENDING');
    for (const v of pending) {
      await pushToTally(v.id);
    }
  };

  return (
    <div className="space-y-6 h-full flex flex-col p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Unified Voucher Queue</h1>
        <div className="space-x-3">
          <button 
            onClick={fetchVouchers}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-sm font-medium transition"
          >
            Refresh
          </button>
          <button 
            onClick={pushAllToTally}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium transition"
          >
            Push All to Tally
          </button>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Voucher No</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">Loading vouchers...</td></tr>
            ) : vouchers.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">No vouchers in queue</td></tr>
            ) : vouchers.map((v) => (
              <tr key={v.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 px-2 py-1 rounded">
                    {v.voucherType === 'PURCHASE' ? 'Vendor' : 'Student'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {v.voucherNumber}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {v.voucherType}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(v.date).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                    ${v.syncStatus === 'PENDING' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' : ''}
                    ${v.syncStatus === 'QUEUED' || v.syncStatus === 'PROCESSING' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' : ''}
                    ${v.syncStatus === 'SYNCED' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : ''}
                    ${v.syncStatus === 'FAILED' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' : ''}
                  `}>
                    {v.syncStatus}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {v.syncStatus === 'PENDING' || v.syncStatus === 'FAILED' ? (
                    <button 
                      onClick={() => pushToTally(v.id)}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                    >
                      Push
                    </button>
                  ) : (
                    <span className="text-gray-400 text-xs">Pushed</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

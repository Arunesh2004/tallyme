'use client';

import React, { useEffect, useState } from 'react';

export default function DashboardPage() {
  const [health, setHealth] = useState<any>({
    ocr: 'MOCKED', ai: 'MOCKED', gmail: 'MOCKED', database: 'CONNECTED',
    redis: 'CONNECTED', bullmq: 'CONNECTED', erpConnector: 'CONNECTED', tallyPrime: 'ERROR'
  });
  const [counts, setCounts] = useState({
    pending: 12, queued: 0, synced: 0, failed: 0
  });

  useEffect(() => {
    fetch('/api/v1/health/pipeline')
      .then(res => res.json())
      .then(json => {
        if (json.success) setHealth(json.data);
      })
      .catch(console.error);
      
    // Fetch counts from vouchers API
    fetch('/api/v1/vouchers')
      .then(res => res.json())
      .then(json => {
        if (json.success && Array.isArray(json.data)) {
          let p=0, q=0, s=0, f=0;
          json.data.forEach((v: any) => {
            if (v.syncStatus === 'PENDING') p++;
            if (v.syncStatus === 'QUEUED') q++;
            if (v.syncStatus === 'SYNCED') s++;
            if (v.syncStatus === 'FAILED') f++;
          });
          setCounts({ pending: p, queued: q, synced: s, failed: f });
        }
      })
      .catch(console.error);
  }, []);

  const Badge = ({ status }: { status: string }) => {
    if (status === 'CONNECTED') return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800 uppercase tracking-wider">CONNECTED</span>;
    if (status === 'MOCKED') return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 uppercase tracking-wider">MOCKED</span>;
    if (status === 'ERROR') return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 uppercase tracking-wider">ERROR</span>;
    return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-800 uppercase tracking-wider">DISCONNECTED</span>;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Operations Dashboard</h1>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5 border-l-4 border-yellow-500">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Pending Vouchers</p>
          <p className="mt-1 text-3xl font-semibold text-yellow-600 dark:text-yellow-500">{counts.pending}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5 border-l-4 border-blue-500">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Queued for Sync</p>
          <p className="mt-1 text-3xl font-semibold text-blue-600 dark:text-blue-500">{counts.queued}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5 border-l-4 border-green-500">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Successfully Synced</p>
          <p className="mt-1 text-3xl font-semibold text-green-600 dark:text-green-500">{counts.synced}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5 border-l-4 border-red-500">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Failed / Retries</p>
          <p className="mt-1 text-3xl font-semibold text-red-600 dark:text-red-500">{counts.failed}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Health */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5 col-span-1">
          <h2 className="text-lg font-medium mb-4">Pipeline Health</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">OCR Service</span>
              <Badge status={health.ocr} />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">AI Extraction</span>
              <Badge status={health.ai} />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Gmail Watch</span>
              <Badge status={health.gmail} />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Database</span>
              <Badge status={health.database} />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Redis Cache</span>
              <Badge status={health.redis} />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">BullMQ Workers</span>
              <Badge status={health.bullmq} />
            </div>
            <div className="flex justify-between items-center border-t border-gray-100 dark:border-gray-700 pt-3 mt-3">
              <span className="text-sm font-bold text-gray-900 dark:text-white">ERP Connector</span>
              <Badge status={health.erpConnector} />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-gray-900 dark:text-white">Tally ERP Prime</span>
              <Badge status={health.tallyPrime} />
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5 col-span-2">
          <h2 className="text-lg font-medium mb-4">Recent Activity Logs</h2>
          <div className="space-y-4">
            <div className="flex space-x-3">
              <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                <span className="text-red-600 text-xs font-bold">ERR</span>
              </div>
              <div>
                <p className="text-sm text-gray-900 dark:text-gray-100">Tally XML Error: <span className="font-medium text-red-600">Voucher date is missing for &apos;Journal&apos;</span>.</p>
                <p className="text-xs text-gray-500">Just now</p>
              </div>
            </div>
            <div className="flex space-x-3">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-blue-600 text-xs font-bold">API</span>
              </div>
              <div>
                <p className="text-sm text-gray-900 dark:text-gray-100">Successfully extracted invoice using Production AI Engine.</p>
                <p className="text-xs text-gray-500">2 minutes ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

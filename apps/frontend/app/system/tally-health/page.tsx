export default function TallyHealthDashboard() {
  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">System Monitoring: Tally Health</h1>
      <p className="text-gray-600">Real-time status of local Tally Agents and Synchronization Queues.</p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border">
          <p className="text-sm text-gray-500 mb-1">Active Agents</p>
          <p className="text-3xl font-bold text-green-600">3</p>
          <p className="text-xs text-gray-400 mt-2">Connected right now</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border">
          <p className="text-sm text-gray-500 mb-1">Sync Success Rate</p>
          <p className="text-3xl font-bold text-blue-600">99.2%</p>
          <p className="text-xs text-gray-400 mt-2">Last 24 hours</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border">
          <p className="text-sm text-gray-500 mb-1">Pending Queue</p>
          <p className="text-3xl font-bold text-yellow-600">12</p>
          <p className="text-xs text-gray-400 mt-2">Awaiting sync</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border">
          <p className="text-sm text-gray-500 mb-1">Average Latency</p>
          <p className="text-3xl font-bold text-gray-800">120ms</p>
          <p className="text-xs text-gray-400 mt-2">Agent to Cloud</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow border mt-8">
        <h2 className="text-lg font-semibold mb-4">First Connection Health Reports</h2>
        <div className="bg-gray-50 p-4 border rounded">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold">Company: ABC School (Agent: Server-01)</h3>
            <span className="text-sm px-2 py-1 bg-yellow-100 text-yellow-800 rounded">Pending Approval</span>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm mt-4">
            <div><span className="font-semibold">Ledgers:</span> 1420</div>
            <div><span className="font-semibold">Groups:</span> 95</div>
            <div><span className="font-semibold">Vouchers:</span> 52,000</div>
          </div>
          <div className="mt-4 pt-4 border-t">
            <p className="font-semibold text-red-600 mb-2">Issues Detected (Phase 29 Org Engine):</p>
            <ul className="list-disc pl-5 text-sm text-gray-700">
              <li>15 duplicate vendors detected</li>
              <li>8 missing GST numbers</li>
              <li>3 invalid hierarchy groups</li>
            </ul>
          </div>
          <button className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm rounded">Review & Approve Sync Setup</button>
        </div>
      </div>
    </div>
  );
}

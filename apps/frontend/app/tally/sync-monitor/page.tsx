export default function SyncMonitorPage() {
  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Sync Monitor</h1>
      
      <div className="space-y-4">
        <div className="bg-white p-6 rounded-lg shadow border flex justify-between items-center">
          <div>
            <h3 className="font-semibold text-lg">Batch #103</h3>
            <p className="text-sm text-gray-500">Processing Vouchers (45/120)</p>
          </div>
          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">PROCESSING</span>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border flex justify-between items-center">
          <div>
            <h3 className="font-semibold text-lg">Batch #102</h3>
            <p className="text-sm text-gray-500">Failed to sync: LEDGER_MISSING</p>
            <div className="mt-2 space-x-2">
              <button className="text-sm text-indigo-600 hover:underline">View XML</button>
              <button className="text-sm text-blue-600 hover:underline">Retry</button>
              <button className="text-sm text-red-600 hover:underline">Rollback</button>
            </div>
          </div>
          <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">FAILED</span>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border flex justify-between items-center">
          <div>
            <h3 className="font-semibold text-lg">Batch #101</h3>
            <p className="text-sm text-gray-500">120 records synced successfully</p>
          </div>
          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">SUCCESS</span>
        </div>
      </div>
    </div>
  );
}

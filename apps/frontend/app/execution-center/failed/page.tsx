export default function ExecutionFailedPage() {
  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold text-red-800">Failed Executions</h1>
      <p className="text-gray-600">Review executions that encountered errors during the pipeline.</p>

      <div className="bg-red-50 p-6 rounded-lg shadow border border-red-100">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-semibold text-lg text-red-900">Execution Request #902: MERGE_DUPLICATE_LEDGER</h3>
            <p className="text-sm text-red-700 mt-1">Failed Step: 2 (Validate Target Ledger)</p>
          </div>
          <span className="px-3 py-1 bg-red-200 text-red-900 rounded-full text-xs font-medium self-start">FAILED</span>
        </div>
        
        <div className="bg-white p-4 rounded border border-red-200 text-sm mb-4">
          <p className="font-semibold text-gray-800 mb-1">Error Message:</p>
          <p className="text-red-600 font-mono">Tally Response: Ledger 'XYZ Corp' is currently locked by another user.</p>
        </div>

        <div className="flex gap-3">
          <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded hover:bg-gray-50">View XML Logs</button>
          <button className="px-4 py-2 bg-red-600 text-white font-medium rounded hover:bg-red-700">Trigger Manual Rollback</button>
        </div>
      </div>
    </div>
  );
}

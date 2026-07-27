export default function ExecutionReviewPage() {
  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Execution Review & Approval</h1>
      <p className="text-gray-600">Finance Manager approval required before any Tally modifications.</p>

      <div className="bg-white p-6 rounded-lg shadow border">
        <div className="flex justify-between border-b pb-4 mb-4">
          <div>
            <h3 className="font-semibold text-lg text-blue-800">Pending Execution: Create Vendor Ledger</h3>
            <p className="text-sm text-gray-500 mt-1">Recommended by: Vendor Resolution Agent</p>
          </div>
          <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium self-start">AWAITING APPROVAL</span>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
          <div>
            <p className="font-semibold text-gray-700">Action Type</p>
            <p className="text-gray-600">CREATE_LEDGER</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700">Target Entity</p>
            <p className="text-gray-600">ABC Traders (Sundry Creditors)</p>
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded border text-sm mb-4">
          <p className="font-semibold text-gray-700 mb-2">Evidence:</p>
          <ul className="list-disc pl-5 text-gray-600 space-y-1">
            <li>GSTIN matched perfectly</li>
            <li>12 previous invoices found in exception queue</li>
          </ul>
        </div>

        <div className="bg-blue-50 p-4 rounded border border-blue-100 text-sm mb-6">
          <p className="font-semibold text-blue-800">Safety Checks Passed:</p>
          <p className="text-blue-700 mt-1">Migration Snapshot will be created automatically. Pre-execution Validation passed.</p>
        </div>

        <div className="flex gap-3">
          <button className="px-4 py-2 bg-green-600 text-white font-medium rounded hover:bg-green-700">Approve Execution</button>
          <button className="px-4 py-2 bg-red-600 text-white font-medium rounded hover:bg-red-700">Reject</button>
        </div>
      </div>
    </div>
  );
}

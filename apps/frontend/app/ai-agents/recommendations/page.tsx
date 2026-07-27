export default function RecommendationsCenter() {
  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Recommendation Center</h1>
      <p className="text-gray-600">Review and approve Accounting Intelligence recommendations.</p>

      <div className="space-y-4">
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="font-semibold text-lg text-red-600">Missing Ledger</h3>
              <p className="text-sm text-gray-500 font-medium mt-1">Recommendation: <span className="text-gray-800">Create ABC Traders</span></p>
              <p className="text-sm text-gray-500 mt-2">Reason: Same GSTIN appeared 18 times in Vendor History.</p>
            </div>
            <div className="text-right">
              <span className="block text-sm font-bold text-green-600 mb-1">97% Confidence</span>
              <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">UNDER REVIEW</span>
            </div>
          </div>
          
          <div className="flex gap-3 pt-4 border-t">
            <button className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700">Approve</button>
            <button className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700">Reject</button>
            <button className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded hover:bg-gray-50">View Evidence</button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="font-semibold text-lg text-red-600">Duplicate Vendor</h3>
              <p className="text-sm text-gray-500 font-medium mt-1">Recommendation: <span className="text-gray-800">Merge Entries</span></p>
              <p className="text-sm text-gray-500 mt-2">Reason: PAN and Mobile matched precisely.</p>
            </div>
            <div className="text-right">
              <span className="block text-sm font-bold text-green-600 mb-1">94% Confidence</span>
              <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">UNDER REVIEW</span>
            </div>
          </div>
          
          <div className="flex gap-3 pt-4 border-t">
            <button className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700">Approve</button>
            <button className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700">Reject</button>
            <button className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded hover:bg-gray-50">View Evidence</button>
          </div>
        </div>
      </div>
    </div>
  );
}

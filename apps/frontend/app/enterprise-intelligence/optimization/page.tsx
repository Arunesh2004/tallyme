export default function OptimizationCenter() {
  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Optimization Center</h1>
      <p className="text-gray-600">Review AI self-optimization suggestions derived from operations data.</p>

      <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-6">
        <p className="text-sm text-blue-800 font-medium">System Rules Enforced: No autonomous AI edits. All threshold or logic weight changes require explicit INTELLIGENCE_ADMIN approval.</p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow border">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-semibold text-lg text-purple-700">Optimization #102: Vendor Resolver Priority Update</h3>
            <p className="text-sm text-gray-600 mt-2"><span className="font-semibold">Observation:</span> Frequent rejections on low confidence vendor matches (&lt;80%).</p>
            <p className="text-sm text-gray-600 mt-1"><span className="font-semibold">Reason:</span> Based on 450 reviewed transactions.</p>
          </div>
          <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">PENDING APPROVAL</span>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm mb-6 border-t pt-4 mt-2">
          <div>
            <p className="font-semibold text-gray-700">Current Logic State</p>
            <p className="text-red-600">Minimum Confidence: 70%</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700">Recommended Logic State</p>
            <p className="text-green-600">Minimum Confidence: 80%</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button className="px-4 py-2 bg-purple-600 text-white font-medium rounded hover:bg-purple-700">Approve Optimization</button>
          <button className="px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded hover:bg-gray-300">Reject</button>
        </div>
      </div>
    </div>
  );
}

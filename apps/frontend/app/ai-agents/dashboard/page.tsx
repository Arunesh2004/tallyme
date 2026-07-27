export default function AIAgentsDashboard() {
  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Accounting Intelligence Dashboard</h1>
      
      <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border text-center">
          <p className="text-sm text-gray-500">Active Agents</p>
          <p className="text-3xl font-bold text-blue-600">5</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border text-center">
          <p className="text-sm text-gray-500">Recommendations Today</p>
          <p className="text-3xl font-bold text-gray-800">42</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border text-center">
          <p className="text-sm text-gray-500">Approved</p>
          <p className="text-3xl font-bold text-green-600">35</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border text-center">
          <p className="text-sm text-gray-500">Rejected</p>
          <p className="text-3xl font-bold text-red-600">7</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border text-center">
          <p className="text-sm text-gray-500">Accuracy</p>
          <p className="text-3xl font-bold text-purple-600">96%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <div className="bg-white p-6 rounded-lg shadow border">
          <h2 className="text-lg font-semibold mb-4">Active Agents Overview</h2>
          <ul className="space-y-3">
            <li className="flex justify-between items-center border-b pb-2">
              <span className="font-medium text-gray-700">Vendor Resolution Agent</span>
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">ACTIVE</span>
            </li>
            <li className="flex justify-between items-center border-b pb-2">
              <span className="font-medium text-gray-700">Ledger Repair Agent</span>
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">ACTIVE</span>
            </li>
            <li className="flex justify-between items-center border-b pb-2">
              <span className="font-medium text-gray-700">Reconciliation Agent</span>
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">ACTIVE</span>
            </li>
            <li className="flex justify-between items-center pb-2">
              <span className="font-medium text-gray-700">Sync Recovery Agent</span>
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">ACTIVE</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

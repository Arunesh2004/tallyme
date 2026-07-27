export default function ExecutionDashboard() {
  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Accounting Execution Dashboard</h1>
      <p className="text-gray-600">Monitor active and historical accounting modifications to Tally.</p>
      
      <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border text-center">
          <p className="text-sm text-gray-500">Pending Execution</p>
          <p className="text-3xl font-bold text-blue-600">3</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border text-center">
          <p className="text-sm text-gray-500">Running Now</p>
          <p className="text-3xl font-bold text-yellow-600">1</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border text-center">
          <p className="text-sm text-gray-500">Completed (Today)</p>
          <p className="text-3xl font-bold text-green-600">18</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border text-center">
          <p className="text-sm text-gray-500">Failed (Today)</p>
          <p className="text-3xl font-bold text-red-600">2</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border text-center">
          <p className="text-sm text-gray-500">Rollbacks Available</p>
          <p className="text-3xl font-bold text-purple-600">2</p>
        </div>
      </div>

      <div className="mt-6 flex space-x-4">
        <a href="/execution-center/review" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Review Pending</a>
        <a href="/execution-center/failed" className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">View Failed</a>
        <a href="/execution-center/history" className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50">Audit History</a>
      </div>
    </div>
  );
}

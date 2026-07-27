export default function CommandCenterPage() {
  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Tally Command Center</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border">
          <h2 className="text-xl font-semibold mb-2">Structure Health</h2>
          <p className="text-4xl font-bold text-green-600">82%</p>
          <ul className="mt-4 text-sm space-y-2 text-gray-600">
            <li>Vendor hierarchy missing</li>
            <li>Student structure missing</li>
            <li>Duplicate ledgers: 14</li>
            <li>Unused groups: 8</li>
          </ul>
          <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Run Scan</button>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <h2 className="text-xl font-semibold mb-2">Recommendations</h2>
          <p className="text-sm text-gray-600 mb-4">AI Organization Recommendations available.</p>
          <button className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">View Recommendations</button>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <h2 className="text-xl font-semibold mb-2">Duplicate Masters</h2>
          <p className="text-sm text-gray-600 mb-4">Detected 14 duplicate candidates across Ledgers and Groups.</p>
          <button className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700">Merge Duplicates</button>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <h2 className="text-xl font-semibold mb-2">Migration Center</h2>
          <p className="text-sm text-gray-600 mb-4">Manage structure migrations to Tally Prime.</p>
          <a href="/tally/migrations" className="px-4 py-2 bg-purple-600 text-white rounded inline-block hover:bg-purple-700">Open Migrations</a>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <h2 className="text-xl font-semibold mb-2">Rollback History</h2>
          <p className="text-sm text-gray-600 mb-4">View past operations and perform rollbacks.</p>
          <a href="/tally/rollback-history" className="px-4 py-2 bg-gray-800 text-white rounded inline-block hover:bg-gray-900">View Rollbacks</a>
        </div>
      </div>
    </div>
  );
}

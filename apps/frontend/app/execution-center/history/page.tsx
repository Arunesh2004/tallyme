export default function ExecutionHistoryPage() {
  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Execution Audit History</h1>
      <p className="text-gray-600">Complete trace of all executed and rolled back operations.</p>

      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approved By</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Executed At</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Result</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rollback</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            <tr>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">CREATE_LEDGER (XYZ Corp)</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Finance Manager</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">2026-07-25 10:15 AM</td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">SUCCESS</span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 hover:underline cursor-pointer">
                Available
              </td>
            </tr>
            <tr>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">MOVE_LEDGER_GROUP</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Finance Manager</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">2026-07-25 09:30 AM</td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">ROLLED_BACK</span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                Executed
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

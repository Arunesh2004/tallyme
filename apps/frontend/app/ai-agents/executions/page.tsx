export default function ExecutionsHistory() {
  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Agent Execution Audit Log</h1>
      <p className="text-gray-600">Historical trace of AI decisions and human approvals.</p>

      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agent</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recommendation</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approved By</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Executed</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Result</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            <tr>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Vendor Resolver</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Create Ledger (ABC Traders)</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Finance Manager</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">YES</td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">SUCCESS</span>
              </td>
            </tr>
            <tr>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Ledger Repair</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Move to Sundry Creditors</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Admin</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">YES</td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">SUCCESS</span>
              </td>
            </tr>
            <tr>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Reconciliation</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Update Tax Classification</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Finance Manager</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">NO</td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">REJECTED</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

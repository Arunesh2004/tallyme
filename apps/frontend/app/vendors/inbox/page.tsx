export default function VendorInbox() {
  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Vendor Operations: Inbox</h1>
      <p className="text-gray-600">Upload invoices and review AI extractions before resolving vendor ledgers.</p>

      <div className="bg-white p-6 rounded-lg shadow border">
        <h2 className="text-lg font-semibold mb-4">Upload New Invoice</h2>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
          <p className="text-gray-500">Drag and drop vendor invoice (PDF/Image) here</p>
          <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">Browse Files</button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor (Extracted)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Confidence</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            <tr>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">INV-2023-001</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">ABC Traders</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm"><span className="text-green-600 font-bold">96%</span></td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <a href="/vendors/review" className="text-blue-600 hover:text-blue-900">Review & Resolve</a>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

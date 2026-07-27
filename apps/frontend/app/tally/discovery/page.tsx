export default function DiscoveryPage() {
  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Tally Environment Discovery</h1>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border text-center">
          <p className="text-sm text-gray-500">Companies</p>
          <p className="text-3xl font-bold text-gray-800">3</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border text-center">
          <p className="text-sm text-gray-500">Ledgers</p>
          <p className="text-3xl font-bold text-gray-800">540</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border text-center">
          <p className="text-sm text-gray-500">Groups</p>
          <p className="text-3xl font-bold text-gray-800">42</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border text-center">
          <p className="text-sm text-gray-500">Vouchers</p>
          <p className="text-3xl font-bold text-gray-800">12,000</p>
        </div>
      </div>

      <div className="bg-red-50 p-6 rounded-lg shadow border border-red-100 mt-6">
        <h2 className="text-lg font-semibold text-red-800 mb-2">Discovery Issues</h2>
        <ul className="list-disc pl-5 text-red-700 space-y-1">
          <li>5 Missing Masters detected in Tally mapping</li>
          <li>2 Ledger hierarchy mismatches</li>
        </ul>
        <button className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Resolve Issues</button>
      </div>
    </div>
  );
}

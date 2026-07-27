export default function MigrationsPage() {
  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Migration Center</h1>
      <p className="text-gray-600">Track and manage Tally structural migrations.</p>

      <div className="space-y-4">
        <div className="bg-white p-6 rounded-lg shadow border flex justify-between items-center">
          <div>
            <h3 className="font-semibold text-lg">Migration #001: Vendor Standardization</h3>
            <p className="text-sm text-gray-500">23 Ledgers, 1 Group created</p>
          </div>
          <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">Pending Approval</span>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border flex justify-between items-center">
          <div>
            <h3 className="font-semibold text-lg">Migration #002: Student Fee Hierarchy</h3>
            <p className="text-sm text-gray-500">140 Ledgers moved</p>
          </div>
          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">Completed</span>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border flex justify-between items-center">
          <div>
            <h3 className="font-semibold text-lg">Migration #003: GST Group Cleanup</h3>
            <p className="text-sm text-gray-500">2 Groups created</p>
          </div>
          <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">Failed</span>
        </div>
      </div>
    </div>
  );
}

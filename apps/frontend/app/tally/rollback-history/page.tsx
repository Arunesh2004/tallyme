export default function RollbackHistoryPage() {
  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Rollback History</h1>
      <p className="text-gray-600">View and execute rollbacks for past operations.</p>

      <div className="space-y-4">
        <div className="bg-white p-6 rounded-lg shadow border flex justify-between items-center">
          <div>
            <h3 className="font-semibold text-lg">Rollback #003 (from Migration #003)</h3>
            <p className="text-sm text-gray-500">Rolled back 2 groups.</p>
          </div>
          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">Completed</span>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border flex justify-between items-center">
          <div>
            <h3 className="font-semibold text-lg">Migration #012</h3>
            <p className="text-sm text-gray-500">Changed 23 Ledgers, 5 Groups</p>
          </div>
          <button className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-medium">Trigger Rollback</button>
        </div>
      </div>
    </div>
  );
}

export default function StudentDashboard() {
  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Student Fee Automation Dashboard</h1>
      <p className="text-gray-600">Track student payments from source to Tally synchronization.</p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border text-center">
          <p className="text-sm text-gray-500 mb-1">Today's Collections</p>
          <p className="text-3xl font-bold text-green-700">₹5,20,000</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border text-center">
          <p className="text-sm text-gray-500 mb-1">Synced to Tally</p>
          <p className="text-3xl font-bold text-blue-600">490</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border text-center">
          <p className="text-sm text-gray-500 mb-1">Pending Approval</p>
          <p className="text-3xl font-bold text-yellow-600">12</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border text-center">
          <p className="text-sm text-gray-500 mb-1">Failed/Exceptions</p>
          <p className="text-3xl font-bold text-red-600">2</p>
        </div>
      </div>

      <div className="mt-8 bg-white p-6 rounded-lg shadow border">
        <h2 className="text-lg font-semibold mb-4">Recent Exception: Missing Student</h2>
        <div className="bg-red-50 p-4 border border-red-200 rounded">
          <p className="font-semibold text-red-800">Transaction TXN-99812</p>
          <p className="text-sm text-red-700 mt-1">Payment of ₹25,000 received from 'Rahul Sharma'. Unable to confidently map to existing student ledger in Tally.</p>
          <button className="mt-3 px-3 py-1.5 bg-red-600 text-white text-sm rounded">Route to Exceptions Queue</button>
        </div>
      </div>
    </div>
  );
}

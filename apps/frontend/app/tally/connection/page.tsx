export default function TallyConnectionPage() {
  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Tally Connection Status</h1>
      
      <div className="bg-white p-6 rounded-lg shadow border space-y-4">
        <div className="flex justify-between items-center border-b pb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-700">Tally Status</h2>
            <p className="text-gray-500 text-sm">Real-time connection tracking</p>
          </div>
          <span className="px-4 py-2 bg-green-100 text-green-800 rounded-full font-bold">CONNECTED ✅</span>
        </div>
        
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div>
            <p className="text-sm text-gray-500">Company</p>
            <p className="font-semibold">ABC School Pvt Ltd</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Response Time</p>
            <p className="font-semibold">120ms</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Last Health Check</p>
            <p className="font-semibold">10 seconds ago</p>
          </div>
        </div>

        <div className="pt-4 flex gap-4">
          <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Run Health Check</button>
          <button className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">Reconnect</button>
          <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50">Change Configuration</button>
        </div>
      </div>
    </div>
  );
}

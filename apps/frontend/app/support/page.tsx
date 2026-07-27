export default function SupportCenter() {
  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Support & Knowledge Base</h1>
      
      <div className="bg-white p-6 rounded shadow border">
        <h2 className="text-lg font-semibold mb-2">Search Knowledge Base</h2>
        <input 
          type="text" 
          placeholder="e.g., Tally Agent is offline, Duplicate GST number..." 
          className="w-full p-3 border rounded text-gray-700" 
        />
        <p className="text-sm text-gray-500 mt-2">Search our AI-powered reasoning engine before submitting a ticket.</p>
      </div>

      <div className="bg-white p-6 rounded shadow border mt-6">
        <h2 className="text-lg font-semibold mb-4">Your Tickets</h2>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b">
              <th className="pb-2 text-sm font-medium text-gray-500">ID</th>
              <th className="pb-2 text-sm font-medium text-gray-500">Title</th>
              <th className="pb-2 text-sm font-medium text-gray-500">Category</th>
              <th className="pb-2 text-sm font-medium text-gray-500">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="py-3 text-sm text-gray-600">#TK-1004</td>
              <td className="py-3 text-sm font-medium">Agent not connecting after restart</td>
              <td className="py-3 text-sm text-gray-600">TALLY_CONNECTION</td>
              <td className="py-3 text-sm"><span className="text-yellow-600 font-semibold">OPEN</span></td>
            </tr>
          </tbody>
        </table>
        <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded text-sm">Create New Ticket</button>
      </div>
    </div>
  );
}

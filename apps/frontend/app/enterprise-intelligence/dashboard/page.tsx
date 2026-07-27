export default function EnterpriseDashboard() {
  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Enterprise AI Intelligence Dashboard</h1>
      <p className="text-gray-600">Unified tracking for Accounting Operations and AI Health.</p>
      
      <div className="bg-white p-6 rounded-lg shadow border mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Overall Intelligence Score</h2>
        <div className="flex items-end gap-2">
          <span className="text-5xl font-bold text-blue-700">87.4</span>
          <span className="text-xl text-gray-500 mb-1">/ 100</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">AI Health</h2>
          <div className="bg-white p-6 rounded-lg shadow border space-y-4">
            <div className="flex justify-between border-b pb-2">
              <span className="text-gray-600">Vendor Resolver Accuracy</span>
              <span className="font-bold text-green-600">91.0%</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-gray-600">Recommendation Acceptance</span>
              <span className="font-bold text-gray-800">85.5%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Learning Improvement (Weekly)</span>
              <span className="font-bold text-blue-600">+3.0%</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Accounting Operations Health</h2>
          <div className="bg-white p-6 rounded-lg shadow border space-y-4">
            <div className="flex justify-between border-b pb-2">
              <span className="text-gray-600">Daily Invoices Processed</span>
              <span className="font-bold text-gray-800">1,450</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-gray-600">Average Resolution Time</span>
              <span className="font-bold text-gray-800">14.5 mins</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Execution Success Rate</span>
              <span className="font-bold text-green-600">96.0%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <div className="bg-white p-4 rounded-lg shadow border text-center">
          <p className="text-sm text-gray-500 mb-1">Knowledge Coverage Score</p>
          <p className="text-3xl font-bold text-purple-600">82%</p>
          <p className="text-xs text-gray-400 mt-2">Decisions supported by knowledge base</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border text-center">
          <p className="text-sm text-gray-500 mb-1">AI Explainability Score</p>
          <p className="text-3xl font-bold text-blue-600">95%</p>
          <p className="text-xs text-gray-400 mt-2">Recommendations with complete evidence trails</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border text-center">
          <p className="text-sm text-gray-500 mb-1">Human Agreement Rate</p>
          <p className="text-3xl font-bold text-green-600">89%</p>
          <p className="text-xs text-gray-400 mt-2">Humans accepted AI recommendations</p>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">Accounting Intelligence Timeline (Audit)</h2>
        <div className="bg-white p-6 rounded-lg shadow border">
           <ul className="space-y-4 relative border-l border-gray-200 ml-3">
             <li className="pl-6">
                <span className="absolute w-3 h-3 bg-blue-600 rounded-full -left-1.5 top-1"></span>
                <p className="text-sm text-gray-500">10:01 AM <span className="font-bold text-gray-700 ml-2">Invoice Uploaded</span></p>
             </li>
             <li className="pl-6">
                <span className="absolute w-3 h-3 bg-blue-600 rounded-full -left-1.5 top-1"></span>
                <p className="text-sm text-gray-500">10:02 AM <span className="font-bold text-gray-700 ml-2">OCR Completed</span></p>
             </li>
             <li className="pl-6">
                <span className="absolute w-3 h-3 bg-blue-600 rounded-full -left-1.5 top-1"></span>
                <p className="text-sm text-gray-500">10:03 AM <span className="font-bold text-gray-700 ml-2">Vendor Agent Generated Recommendation</span></p>
             </li>
             <li className="pl-6">
                <span className="absolute w-3 h-3 bg-blue-600 rounded-full -left-1.5 top-1"></span>
                <p className="text-sm text-gray-500">10:05 AM <span className="font-bold text-gray-700 ml-2">Manager Approved</span></p>
             </li>
             <li className="pl-6">
                <span className="absolute w-3 h-3 bg-blue-600 rounded-full -left-1.5 top-1"></span>
                <p className="text-sm text-gray-500">10:06 AM <span className="font-bold text-gray-700 ml-2">Ledger Created In Tally</span></p>
             </li>
           </ul>
        </div>
      </div>
    </div>
  );
}

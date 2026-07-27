export default function AccountingCopilotDashboard() {
  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Accounting Copilot (Explainability Assistant)</h1>
      <p className="text-gray-600">Enterprise-grade AI reasoning transparency. Ask questions, explore recommendations, and review evidence.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Recommendation Explorer */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Recommendation Explorer</h2>
          
          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex justify-between items-center mb-4 pb-2 border-b">
              <h3 className="font-bold text-blue-800 text-lg">Create Vendor Ledger</h3>
              <span className="bg-green-100 text-green-800 text-xs px-3 py-1 rounded-full font-bold">96% Confidence</span>
            </div>

            <div className="space-y-4">
              <div>
                <p className="font-semibold text-gray-700">Reason Summary:</p>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded mt-1">
                  Ledger creation was recommended because GSTIN matched previous invoices and no existing ledger was found in Tally.
                </p>
              </div>

              <div>
                <p className="font-semibold text-gray-700">Evidence Collected:</p>
                <ul className="text-sm text-gray-600 list-decimal pl-5 space-y-1 mt-1">
                  <li>GSTIN matched invoice: 29ABCDE1234F1Z5</li>
                  <li>No existing Tally ledger found in Sundry Creditors</li>
                  <li>Three previous invoices used same vendor identity</li>
                </ul>
              </div>

              <div>
                <p className="font-semibold text-gray-700">Rules Applied:</p>
                <ul className="text-sm text-blue-700 list-disc pl-5 space-y-1 mt-1 bg-blue-50 p-2 rounded">
                  <li>Vendor GST Priority Rule v2</li>
                  <li>Sundry Creditor Hierarchical Placement v1</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t flex gap-2">
              <button className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded">Provide Feedback</button>
              <button className="px-3 py-1.5 bg-gray-200 text-gray-800 text-sm rounded">View Full Logic Trace</button>
            </div>
          </div>
        </div>

        {/* Exception Explainer */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Exception Explainer</h2>
          
          <div className="bg-white p-6 rounded-lg shadow border border-red-100">
            <h3 className="font-bold text-red-800 text-lg mb-2">Tally Sync Failed: Ledger Missing</h3>
            
            <div className="space-y-4">
              <div>
                <p className="font-semibold text-gray-700">Context:</p>
                <p className="text-sm text-gray-600">Voucher requires 'XYZ Corp' which does not exist in the current Tally Snapshot.</p>
              </div>

              <div>
                <p className="font-semibold text-gray-700">AI Analysis:</p>
                <p className="text-sm text-gray-600">
                  The Sync Recovery Agent analyzed this failure and matched it to a known missing master pattern. 
                  Knowledge Document 'Master Sync Failures v3' suggests running the Vendor Resolution Agent.
                </p>
              </div>

              <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                <p className="font-semibold text-yellow-800 text-sm">Suggested Resolution:</p>
                <p className="text-sm text-yellow-700 mt-1">Route to Vendor Queue for manual mapping or AI-assisted ledger creation.</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

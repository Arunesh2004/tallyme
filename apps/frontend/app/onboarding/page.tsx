export default function OnboardingChecklist() {
  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Welcome to TallyMe Enterprise</h1>
      <p className="text-gray-600">Follow these steps to connect your organization and enable AI automation.</p>

      <div className="space-y-4 mt-8">
        <div className="p-4 border rounded bg-green-50 border-green-200 flex items-center">
          <div className="h-8 w-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold mr-4">✓</div>
          <div>
            <h3 className="font-semibold text-green-800">1. Organization Created</h3>
            <p className="text-sm text-green-600">Your enterprise tenant has been securely isolated.</p>
          </div>
        </div>

        <div className="p-4 border rounded bg-blue-50 border-blue-200 flex items-center">
          <div className="h-8 w-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold mr-4">2</div>
          <div>
            <h3 className="font-semibold text-blue-900">2. Install Tally Agent</h3>
            <p className="text-sm text-blue-700 mb-2">Download the lightweight Windows service to securely connect Tally Prime.</p>
            <button className="px-4 py-2 bg-blue-600 text-white rounded text-sm">Download TallyMe-Agent-Setup.exe</button>
            <p className="text-xs text-gray-500 mt-2">Agent Token: <span className="font-mono bg-gray-200 px-1">TALLY_******************</span></p>
          </div>
        </div>

        <div className="p-4 border rounded bg-gray-50 border-gray-200 flex items-center opacity-60">
          <div className="h-8 w-8 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center font-bold mr-4">3</div>
          <div>
            <h3 className="font-semibold text-gray-700">3. Master Health Scan</h3>
            <p className="text-sm text-gray-500">Automatically discovers companies, ledgers, and highlights structural issues.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

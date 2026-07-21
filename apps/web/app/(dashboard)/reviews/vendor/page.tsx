import React from 'react';

export default function VendorReviewsPage() {
  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Vendor Slip Reviews</h1>
        <div className="text-sm text-gray-500">2 pending reviews</div>
      </div>
      
      {/* Workspace Split Pane */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 overflow-hidden">
        
        {/* Left Pane: Document Preview */}
        <div className="flex-1 bg-gray-200 dark:bg-gray-800 rounded-lg shadow border border-gray-300 dark:border-gray-700 flex flex-col overflow-hidden">
          <div className="p-3 bg-gray-100 dark:bg-gray-900 border-b border-gray-300 dark:border-gray-700 flex justify-between">
            <span className="text-sm font-medium">invoice-1044.pdf</span>
            <span className="text-sm text-gray-500">Uploaded 20 mins ago</span>
          </div>
          <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-800/50 p-4 relative overflow-auto">
             {/* Mock PDF Viewer */}
             <div className="bg-white w-full max-w-lg aspect-[1/1.4] shadow-md border p-8 space-y-4">
                <div className="flex justify-between border-b pb-4">
                  <h2 className="text-2xl font-bold text-gray-800">ABC Suppliers</h2>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">INVOICE</p>
                    <p className="font-bold text-gray-800">INV-2024-998</p>
                  </div>
                </div>
                <div className="py-4">
                  <p className="text-sm text-gray-600">Billed To: TallyMe Corp</p>
                  <p className="text-sm text-gray-600">Date: 21 Jul 2026</p>
                </div>
                <table className="w-full text-sm mt-8">
                  <thead className="border-b bg-gray-50">
                    <tr><th className="text-left p-2">Item</th><th className="text-right p-2">Amount</th></tr>
                  </thead>
                  <tbody>
                    <tr className="border-b"><td className="p-2 text-gray-800">Server Hosting</td><td className="p-2 text-right text-gray-800">1,250.00</td></tr>
                  </tbody>
                </table>
             </div>
          </div>
        </div>

        {/* Right Pane: Data & Action Workspace */}
        <div className="w-full lg:w-96 flex flex-col space-y-4 overflow-y-auto pr-2">
          
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-5 border border-yellow-300 dark:border-yellow-700">
            <div className="flex items-center space-x-2 text-yellow-600 dark:text-yellow-500 mb-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h3 className="font-semibold text-sm">Validation Warning</h3>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">Vendor match confidence is 65%. Please verify the selected vendor.</p>
          </div>

          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-5">
             <h3 className="text-md font-medium border-b border-gray-200 dark:border-gray-700 pb-2 mb-4">Extracted Data</h3>
             
             <div className="space-y-4">
               <div>
                 <label className="block text-xs font-medium text-gray-500">Invoice Number</label>
                 <input type="text" className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-1.5 px-3 text-sm bg-gray-50 dark:bg-gray-700" defaultValue="INV-2024-998" />
               </div>
               <div>
                 <label className="block text-xs font-medium text-gray-500">Date</label>
                 <input type="date" className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-1.5 px-3 text-sm bg-gray-50 dark:bg-gray-700" defaultValue="2026-07-21" />
               </div>
               <div>
                 <label className="block text-xs font-medium text-gray-500">Total Amount</label>
                 <input type="number" className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-1.5 px-3 text-sm bg-gray-50 dark:bg-gray-700" defaultValue="1250.00" />
               </div>
             </div>
          </div>

          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-5">
             <h3 className="text-md font-medium border-b border-gray-200 dark:border-gray-700 pb-2 mb-4">Accounting Mapping</h3>
             
             <div className="space-y-4">
               <div>
                 <label className="block text-xs font-medium text-gray-500 flex justify-between">
                   Vendor Ledger
                   <span className="text-yellow-600 text-[10px]">65% Match</span>
                 </label>
                 <select className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-1.5 px-3 text-sm bg-gray-50 dark:bg-gray-700">
                   <option>ABC Suppliers Pvt Ltd</option>
                   <option>ABC Corp</option>
                   <option>Select vendor...</option>
                 </select>
               </div>
               <div>
                 <label className="block text-xs font-medium text-gray-500">Expense Ledger</label>
                 <select className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-1.5 px-3 text-sm bg-gray-50 dark:bg-gray-700">
                   <option>Computer Equipment</option>
                   <option>Cloud Hosting</option>
                   <option>Miscellaneous</option>
                 </select>
               </div>
             </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-4 rounded-lg flex flex-col space-y-3">
             <button className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded shadow-sm text-sm">
               Approve & Generate Voucher
             </button>
             <button className="w-full bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-medium py-2 px-4 rounded shadow-sm text-sm">
               Reject Document
             </button>
          </div>

        </div>
      </div>
    </div>
  );
}

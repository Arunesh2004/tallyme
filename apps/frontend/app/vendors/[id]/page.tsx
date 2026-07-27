"use client";

import { useVendor } from "@/queries/useVendors";
import { useParams } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { format } from "date-fns";

export default function VendorDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: vendor, isLoading, error } = useVendor(id);

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="p-8 space-y-4">
          <div className="h-8 w-64 bg-gray-800 rounded animate-pulse"></div>
          <div className="h-40 bg-gray-800 rounded animate-pulse"></div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error || !vendor) {
    return (
      <ProtectedRoute>
        <div className="p-8 text-red-500">Error loading vendor details.</div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="p-8 space-y-6 text-white bg-[#0A0A0A] min-h-screen">
        <h1 className="text-3xl font-bold tracking-tight">Vendor: {vendor.name}</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#111] border border-[#222] p-6 rounded-xl">
            <h2 className="text-xl font-semibold mb-4 text-[#E5E5E5]">Vendor Details</h2>
            <div className="space-y-3 text-sm text-gray-400">
              <p><span className="text-gray-500 w-32 inline-block">Code:</span> {vendor.vendorCode || 'N/A'}</p>
              <p><span className="text-gray-500 w-32 inline-block">GSTIN:</span> {vendor.gstin || 'N/A'}</p>
              <p><span className="text-gray-500 w-32 inline-block">PAN:</span> {vendor.pan || 'N/A'}</p>
            </div>
          </div>

          <div className="bg-[#111] border border-[#222] p-6 rounded-xl">
            <h2 className="text-xl font-semibold mb-4 text-[#E5E5E5]">Ledger Mapping</h2>
            <div className="space-y-3 text-sm text-gray-400">
              <p><span className="text-gray-500 w-32 inline-block">Default Ledger:</span> {vendor.ledgerMapping.defaultLedger}</p>
              <p><span className="text-gray-500 w-32 inline-block">Sync Status:</span> 
                <span className={`ml-2 px-2 py-1 rounded text-xs bg-emerald-500/20 text-emerald-400`}>
                  {vendor.syncStatus}
                </span>
              </p>
            </div>
          </div>

          <div className="bg-[#111] border border-[#222] p-6 rounded-xl md:col-span-2">
            <h2 className="text-xl font-semibold mb-4 text-[#E5E5E5]">Transaction History</h2>
            <div className="space-y-3 text-sm text-gray-400">
              <p><span className="text-gray-500 w-48 inline-block">Total Transactions:</span> {vendor.transactionHistory.totalTransactions}</p>
              <p><span className="text-gray-500 w-48 inline-block">Last Transaction Date:</span> {vendor.transactionHistory.lastTransactionDate ? format(new Date(vendor.transactionHistory.lastTransactionDate), 'PP') : 'N/A'}</p>
            </div>
            
            {vendor.transactionHistory.recentMatches?.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-gray-300 mb-2">Recent Matches</h3>
                <ul className="space-y-2">
                  {vendor.transactionHistory.recentMatches.map((match: any) => (
                    <li key={match.id} className="bg-[#1A1A1A] p-3 rounded text-sm text-gray-400 flex justify-between">
                      <span>Document: {match.document?.fileUrl.split('/').pop() || 'Unknown'}</span>
                      <span>Confidence: {(match.confidence * 100).toFixed(1)}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

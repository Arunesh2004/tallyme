"use client";

import { useState } from "react";
import { useVendors } from "@/queries/useVendors";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { format } from "date-fns";
import Link from "next/link";

export default function VendorsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const limit = 10;

  const { data, isLoading, error } = useVendors(page, limit, search);

  return (
    <ProtectedRoute>
      <div className="p-8 space-y-6 text-white bg-[#0A0A0A] min-h-screen">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">Vendors</h1>
          <input 
            type="text" 
            placeholder="Search GSTIN, Name..." 
            className="bg-[#111] border border-[#333] text-sm px-4 py-2 rounded focus:outline-none focus:border-blue-500 w-64"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="h-16 bg-gray-800 rounded animate-pulse w-full"></div>
            ))}
          </div>
        ) : error ? (
          <div className="text-red-500">Failed to load vendors.</div>
        ) : (
          <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
            <table className="w-full text-left text-sm text-gray-400">
              <thead className="bg-[#1A1A1A] text-gray-300 uppercase text-xs">
                <tr>
                  <th className="px-6 py-4 font-semibold">Vendor Name</th>
                  <th className="px-6 py-4 font-semibold">GSTIN</th>
                  <th className="px-6 py-4 font-semibold">Ledger</th>
                  <th className="px-6 py-4 font-semibold">Last Activity</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222]">
                {data?.data?.map((vendor: any) => (
                  <tr key={vendor.id} className="hover:bg-[#1A1A1A] transition-colors">
                    <td className="px-6 py-4 font-medium text-[#E5E5E5]">{vendor.name || 'Unnamed'}</td>
                    <td className="px-6 py-4">{vendor.gstin || 'N/A'}</td>
                    <td className="px-6 py-4">{vendor.ledgerMapping.defaultLedger}</td>
                    <td className="px-6 py-4">{vendor.transactionHistory.lastTransactionDate ? format(new Date(vendor.transactionHistory.lastTransactionDate), 'PP') : 'No History'}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded text-xs bg-emerald-500/20 text-emerald-400">
                        {vendor.syncStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/vendors/${vendor.id}`} className="text-blue-400 hover:text-blue-300 transition-colors">
                        View Profile
                      </Link>
                    </td>
                  </tr>
                ))}
                {data?.data?.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">No vendors found.</td>
                  </tr>
                )}
              </tbody>
            </table>
            
            {/* Pagination Controls */}
            {data?.pagination && data.pagination.total > limit && (
              <div className="p-4 border-t border-[#222] flex justify-between items-center text-sm">
                <span>Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, data.pagination.total)} of {data.pagination.total}</span>
                <div className="space-x-2">
                  <button 
                    disabled={page === 1} 
                    onClick={() => setPage(p => p - 1)}
                    className="px-3 py-1 bg-[#222] rounded disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button 
                    disabled={page * limit >= data.pagination.total} 
                    onClick={() => setPage(p => p + 1)}
                    className="px-3 py-1 bg-[#222] rounded disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

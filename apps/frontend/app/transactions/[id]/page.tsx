"use client";

import { useTransaction } from "@/queries/useTransactions";
import { useParams } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { format } from "date-fns";

export default function TransactionDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: transaction, isLoading, error } = useTransaction(id);

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

  if (error || !transaction) {
    return (
      <ProtectedRoute>
        <div className="p-8 text-red-500">Error loading transaction details.</div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="p-8 space-y-6 text-white bg-[#0A0A0A] min-h-screen">
        <h1 className="text-3xl font-bold tracking-tight">Transaction: {transaction.voucherNumber}</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#111] border border-[#222] p-6 rounded-xl">
            <h2 className="text-xl font-semibold mb-4 text-[#E5E5E5]">Voucher Details</h2>
            <div className="space-y-3 text-sm text-gray-400">
              <p><span className="text-gray-500 w-32 inline-block">Date:</span> {format(new Date(transaction.date), 'PPp')}</p>
              <p><span className="text-gray-500 w-32 inline-block">Type:</span> {transaction.type}</p>
              <p><span className="text-gray-500 w-32 inline-block">Status:</span> 
                <span className={`ml-2 px-2 py-1 rounded text-xs ${transaction.voucher.status === 'SYNCED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                  {transaction.voucher.status}
                </span>
              </p>
            </div>
          </div>

          <div className="bg-[#111] border border-[#222] p-6 rounded-xl">
            <h2 className="text-xl font-semibold mb-4 text-[#E5E5E5]">Accounting Decision</h2>
            <div className="space-y-3 text-sm text-gray-400">
              <p><span className="text-gray-500 w-32 inline-block">Ledger:</span> {transaction.accountingDecision.ledger}</p>
              <p><span className="text-gray-500 w-32 inline-block">Rule Applied:</span> {transaction.accountingDecision.rule}</p>
            </div>
          </div>

          <div className="bg-[#111] border border-[#222] p-6 rounded-xl">
            <h2 className="text-xl font-semibold mb-4 text-[#E5E5E5]">Extraction Context</h2>
            <div className="space-y-3 text-sm text-gray-400">
              <p><span className="text-gray-500 w-32 inline-block">Confidence:</span> {(transaction.extraction.confidence * 100).toFixed(1)}%</p>
              <p><span className="text-gray-500 w-32 inline-block">Status:</span> {transaction.extraction.status}</p>
              <p><span className="text-gray-500 w-32 inline-block">Source Document:</span> {transaction.sourceDocument.fileName}</p>
            </div>
          </div>

          <div className="bg-[#111] border border-[#222] p-6 rounded-xl">
            <h2 className="text-xl font-semibold mb-4 text-[#E5E5E5]">ERP Sync</h2>
            <div className="space-y-3 text-sm text-gray-400">
              <p><span className="text-gray-500 w-32 inline-block">Sync Status:</span> {transaction.erpSync.status}</p>
              <p><span className="text-gray-500 w-32 inline-block">Last Attempt:</span> {transaction.erpSync.lastAttempt ? format(new Date(transaction.erpSync.lastAttempt), 'PPp') : 'N/A'}</p>
              <p><span className="text-gray-500 w-32 inline-block">Attempts:</span> {transaction.erpSync.attempts}</p>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

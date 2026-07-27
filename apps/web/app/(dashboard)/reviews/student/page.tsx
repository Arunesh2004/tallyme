'use client';

import React, { useState, useEffect } from 'react';
import { ReviewLayout } from '../../../../shared/components/reviews/ReviewLayout';
import { DocumentViewer } from '../../../../shared/components/reviews/DocumentViewer';
import { ReviewSidebar, ReviewSection, ReviewStatusBadge } from '../../../../shared/components/reviews/ReviewSidebar';

export default function StudentReviewsPage() {
  const [selectedReview, setSelectedReview] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const res = await fetch('/api/v1/students/transactions');
        const json = await res.json();
        if (json.success) {
          setTransactions(json.data);
        }
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    fetchTransactions();
  }, []);

  if (!selectedReview) {
    return (
      <div className="space-y-6 h-full flex flex-col">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Student Transaction Monitor</h1>
          <div className="text-sm text-gray-500">{transactions.length} recent transactions</div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mode</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">Loading transactions...</td></tr>
              ) : transactions.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{r.student?.studentName || 'Unknown'}</div>
                    <div className="text-sm text-gray-500">{r.student?.admissionNumber || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-gray-100">{r.reference}</div>
                    <div className="text-xs text-gray-500">{new Date(r.transactionDate).toLocaleDateString()}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 font-medium">
                    ₹{r.amount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${r.status === 'COMPLETED' || r.status === 'EXACT_MATCH' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : ''}
                      ${r.status === 'PARTIAL_MATCH' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' : ''}
                      ${r.status === 'UNMATCHED' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' : ''}
                      ${r.status === 'OVERPAYMENT' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' : ''}
                    `}>
                      {r.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {r.paymentMode}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      onClick={() => setSelectedReview(r)}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded"
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // REVIEW PANEL
  return (
    <ReviewLayout title="Review Student Payment" subtitle={`Reference: ${selectedReview.reference}`}>
      
      <DocumentViewer fileUrl="" fileName={`${selectedReview.reference}_receipt.pdf`} />
      
      <ReviewSidebar>
        
        {selectedReview.status === 'OVERPAYMENT' && (
          <ReviewStatusBadge 
            type="info" 
            title="Overpayment Detected" 
            message="The paid amount (₹48,000) exceeds the outstanding fee structure (₹45,000). A ledger credit will be created for the remaining balance." 
          />
        )}
        {selectedReview.status === 'UNMATCHED' && (
          <ReviewStatusBadge 
            type="error" 
            title="Unmatched Payment" 
            message="We could not link this payment to any existing student profile or fee structure." 
          />
        )}
        
        <ReviewSection title="Suggested Match">
          <div className="p-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100">{selectedReview.studentName}</h4>
            <p className="text-sm text-gray-500">{selectedReview.regNo}</p>
            <div className="mt-2 text-sm flex justify-between">
              <span>Match Confidence:</span>
              <span className="font-medium text-blue-600">{selectedReview.confidence}</span>
            </div>
          </div>
        </ReviewSection>

        <ReviewSection title="Difference Analysis">
          <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
            <span className="text-sm text-gray-500">Amount Received</span>
            <span className="text-sm font-medium">₹{selectedReview.amount}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
            <span className="text-sm text-gray-500">Fee Due (Term 1)</span>
            <span className="text-sm font-medium">₹45,000</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-sm text-gray-500">Variance</span>
            <span className={`text-sm font-bold ${selectedReview.status === 'OVERPAYMENT' ? 'text-green-600' : 'text-gray-900'}`}>
              + ₹3,000
            </span>
          </div>
        </ReviewSection>

        <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-4 rounded-lg flex flex-col space-y-3 mt-4">
          <button 
            onClick={() => setSelectedReview(null)}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded shadow-sm text-sm"
          >
            Approve & Merge
          </button>
          {selectedReview.status === 'UNMATCHED' && (
            <button className="w-full bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 font-medium py-2 px-4 rounded shadow-sm text-sm">
              Assign Student Manually
            </button>
          )}
          <button 
            onClick={() => setSelectedReview(null)}
            className="w-full bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium py-2 px-4 rounded shadow-sm text-sm"
          >
            Back to List
          </button>
        </div>

      </ReviewSidebar>
    </ReviewLayout>
  );
}

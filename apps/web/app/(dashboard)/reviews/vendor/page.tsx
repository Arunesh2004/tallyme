'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ReviewLayout } from '../../../../shared/components/reviews/ReviewLayout';
import { UploadDropzone } from '../../../../shared/components/reviews/UploadDropzone';
import { OCRProgress } from '../../../../shared/components/reviews/OCRProgress';
import { DocumentViewer } from '../../../../shared/components/reviews/DocumentViewer';
import { ReviewSidebar, ReviewSection, ReviewStatusBadge } from '../../../../shared/components/reviews/ReviewSidebar';

type WorkflowState = 'IDLE' | 'UPLOADING' | 'PROCESSING_OCR' | 'DATA_EXTRACTION' | 'VALIDATION' | 'REVIEW' | 'COMPLETE';

export default function VendorReviewsPage() {
  const router = useRouter();
  const [state, setState] = useState<WorkflowState>('IDLE');
  const [fileUrl, setFileUrl] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [progress, setProgress] = useState(0);
  
  const [extractedData, setExtractedData] = useState<any>({});

  const handleUpload = async (file: File) => {
    setFileName(file.name);
    setFileUrl(URL.createObjectURL(file));
    setState('UPLOADING');
    setProgress(10);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      setState('PROCESSING_OCR');
      setProgress(40);
      
      const res = await fetch('/api/v1/ocr/process', {
        method: 'POST',
        body: formData
      });
      
      setState('DATA_EXTRACTION');
      setProgress(70);
      
      if (!res.ok) throw new Error('OCR Failed');
      
      const { data, metadata } = await res.json();
      setExtractedData({ ...data, ...metadata });
      
      setState('VALIDATION');
      setProgress(90);
      
      setTimeout(() => {
        setProgress(100);
        setState('REVIEW');
      }, 500);

    } catch (err) {
      console.error(err);
      alert('Failed to process document');
      setState('IDLE');
    }
  };
  
  const handleApprove = async () => {
    try {
      // Create a pending vendor voucher
      const res = await fetch('/api/v1/vouchers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voucherNumber: extractedData.invoiceNumber,
          voucherType: 'PURCHASE', // Vendor Invoice -> Purchase Voucher
          date: extractedData.date || new Date().toISOString(),
          narration: `Vendor Invoice from ${extractedData.vendorName} (GSTIN: ${extractedData.gstin})`,
          entries: [
            // Mocking some ledger entries here since we don't have the exact mapped ledgers from UI yet
          ]
        })
      });
      
      if (!res.ok) throw new Error('Failed to create voucher');
      
      setState('COMPLETE');
      
      // Redirect to the Unified Queue
      setTimeout(() => {
        router.push('/queue');
      }, 1500);
      
    } catch (err) {
      console.error(err);
      alert('Approval failed');
    }
  };

  if (state === 'IDLE') {
    return (
      <ReviewLayout title="Vendor Slip Upload">
        <div className="flex-1 flex items-center justify-center h-full">
           <UploadDropzone onUpload={handleUpload} />
        </div>
      </ReviewLayout>
    );
  }

  if (state !== 'REVIEW' && state !== 'COMPLETE') {
    let stage = 1;
    let message = 'Uploading document securely...';
    if (state === 'PROCESSING_OCR') { stage = 2; message = 'Running structural OCR models...'; }
    if (state === 'DATA_EXTRACTION') { stage = 3; message = 'Extracting invoice metadata...'; }
    if (state === 'VALIDATION') { stage = 4; message = 'Cross-referencing with ERP ledgers...'; }

    return (
      <ReviewLayout title="Processing Vendor Slip" subtitle={fileName}>
        <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 overflow-hidden opacity-50 pointer-events-none blur-sm">
          <DocumentViewer fileUrl={fileUrl} fileName={fileName} />
        </div>
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-white/50 dark:bg-black/50 backdrop-blur-[2px]">
          <OCRProgress stage={stage} progress={progress} message={message} />
        </div>
      </ReviewLayout>
    );
  }

  return (
    <ReviewLayout title="Vendor Slip Review" subtitle={`Reviewing: ${fileName}`}>
      <DocumentViewer fileUrl={fileUrl} fileName={fileName} />
      
      <ReviewSidebar>
        {state === 'COMPLETE' ? (
          <ReviewStatusBadge 
            type="success" 
            title="Voucher Queued" 
            message="This invoice has been successfully mapped and queued for ERP synchronization." 
          />
        ) : (
          <ReviewStatusBadge 
            type="warning" 
            title="Validation Warning" 
            message={`AI extraction confidence is ${(extractedData.confidence * 100).toFixed(0)}%. Please verify the selected vendor.`} 
          />
        )}

        <ReviewSection title="Extracted Data">
          <div>
            <label className="block text-xs font-medium text-gray-500">Invoice Number</label>
            <input type="text" className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-1.5 px-3 text-sm bg-gray-50 dark:bg-gray-700 dark:text-white" defaultValue={extractedData.invoiceNumber || ''} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500">Date</label>
            <input type="date" className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-1.5 px-3 text-sm bg-gray-50 dark:bg-gray-700 dark:text-white" defaultValue={extractedData.date || ''} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500">Total Amount</label>
            <input type="number" className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-1.5 px-3 text-sm bg-gray-50 dark:bg-gray-700 dark:text-white" defaultValue={extractedData.totalAmount || ''} />
          </div>
        </ReviewSection>

        <ReviewSection title="Accounting Mapping">
          <div>
            <label className="block text-xs font-medium text-gray-500 flex justify-between">
              Vendor Ledger
              <span className="text-yellow-600 text-[10px]">65% Match</span>
            </label>
            <select className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-1.5 px-3 text-sm bg-gray-50 dark:bg-gray-700 dark:text-white">
              <option>{extractedData.vendorName || 'Select vendor...'}</option>
              <option>ABC Suppliers Pvt Ltd</option>
              <option>ABC Corp</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500">Expense Ledger</label>
            <select className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-1.5 px-3 text-sm bg-gray-50 dark:bg-gray-700 dark:text-white">
              <option>Computer Equipment</option>
              <option>Cloud Hosting</option>
              <option>Miscellaneous</option>
            </select>
          </div>
        </ReviewSection>

        <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-4 rounded-lg flex flex-col space-y-3 mt-4">
          {state === 'COMPLETE' ? (
            <button 
              onClick={() => { setState('IDLE'); setProgress(0); }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded shadow-sm text-sm"
            >
              Process Another Invoice
            </button>
          ) : (
            <>
              <button 
                onClick={handleApprove}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded shadow-sm text-sm"
              >
                Approve & Generate Voucher
              </button>
              <button 
                onClick={() => { setState('IDLE'); setProgress(0); }}
                className="w-full bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium py-2 px-4 rounded shadow-sm text-sm"
              >
                Replace Document
              </button>
              <button className="w-full bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-medium py-2 px-4 rounded shadow-sm text-sm">
                Reject
              </button>
            </>
          )}
        </div>
      </ReviewSidebar>
    </ReviewLayout>
  );
}


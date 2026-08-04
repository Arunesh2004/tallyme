'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ReviewLayout } from '../../../../shared/components/reviews/ReviewLayout';
import { UploadDropzone } from '../../../../shared/components/reviews/UploadDropzone';
import { OCRProgress } from '../../../../shared/components/reviews/OCRProgress';
import { DocumentViewer } from '../../../../shared/components/reviews/DocumentViewer';
import { ReviewSidebar, ReviewSection, ReviewStatusBadge } from '../../../../shared/components/reviews/ReviewSidebar';
import { apiClient } from '../../../../lib/api-client';

type WorkflowState = 'IDLE' | 'UPLOADING' | 'QUEUED' | 'PROCESSING_OCR' | 'DATA_EXTRACTION' | 'VALIDATION' | 'REVIEW' | 'COMPLETE' | 'FAILED';

interface LineItem {
  description: string;
  quantity?: number;
  rate?: number;
  unitPrice?: number;
  amount?: number;
  totalPrice?: number;
}

interface InvoiceCandidateData {
  id?: string;
  status?: string;
  invoiceNumber?: string;
  date?: string;
  total?: number;
  tax?: number;
  vendorName?: string;
  extractedName?: string;
  gstin?: string;
  extractedGstin?: string;
  mappedVendorId?: string;
  mappedExpenseLedgerId?: string;
  extractedData?: {
    lineItems?: LineItem[];
    confidence?: number;
  };
  document?: {
    confidenceScore?: number;
  };
}

export default function VendorReviewsPage() {
  const router = useRouter();
  const [state, setState] = useState<WorkflowState>('IDLE');
  const [fileUrl, setFileUrl] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  
  const [extractedData, setExtractedData] = useState<InvoiceCandidateData>({});
  const [, setCandidateId] = useState<string>('');
  const [candidateStatus, setCandidateStatus] = useState<string>('');
  const [confidence, setConfidence] = useState<number>(0);

  const handleUpload = async (file: File) => {
    setFileName(file.name);
    setFileUrl(URL.createObjectURL(file));
    setState('UPLOADING');
    setProgress(10);
    setErrorMessage('');
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // 1. Upload File
      const uploadRes = await apiClient.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const { fileId } = uploadRes.data;
      if (!fileId) throw new Error('Upload failed: No fileId returned');
      
      setState('PROCESSING_OCR');
      setProgress(40);
      
      // 2. Trigger OCR Process
      const processRes = await apiClient.post(`/ocr/process/${fileId}`);
      const { candidateId: returnedCandidateId } = processRes.data;
      
      if (!returnedCandidateId) throw new Error('OCR Process failed: No candidateId returned');
      
      setState('DATA_EXTRACTION');
      setProgress(70);

      // 3. Poll Status
      let isProcessing = true;
      let attempts = 0;
      const MAX_ATTEMPTS = 60; // 2 minutes max (every 2s)

      while (isProcessing && attempts < MAX_ATTEMPTS) {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const statusRes = await apiClient.get(`/ocr/${fileId}/status`);
        const { documentStatus, candidateStatus: currentCandidateStatus } = statusRes.data;
        
        // Break out of polling when no longer processing
        if (
          !documentStatus.includes('PROCESSING') && 
          documentStatus !== 'UPLOADED' && 
          currentCandidateStatus !== 'EXTRACTED'
        ) {
          isProcessing = false;
        }

        if (documentStatus.includes('FAILED') || currentCandidateStatus === 'FAILED') {
          throw new Error('Extraction failed on the backend.');
        }
      }

      if (isProcessing) {
        throw new Error('Polling timed out.');
      }
      
      setState('VALIDATION');
      setProgress(90);
      
      // 4. Hydrate Candidate Data
      const candidateRes = await apiClient.get(`/ocr/${fileId}/candidate`);
      const candidate = candidateRes.data;
      
      setExtractedData(candidate);
      setCandidateId(candidate.id);
      setCandidateStatus(candidate.status);
      setConfidence(candidate.extractedData?.confidence || candidate.document?.confidenceScore || 0);
      
      setProgress(100);
      setState('REVIEW');

    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'Failed to process document';
      setErrorMessage(message);
      setState('FAILED');
    }
  };
  
  const handleApprove = async () => {
    try {
      // Create a pending vendor voucher via local Next.js API
      const res = await fetch('/api/v1/vouchers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voucherNumber: extractedData.invoiceNumber,
          voucherType: 'Purchase', // Vendor Invoice -> Purchase Voucher
          date: extractedData.date || new Date().toISOString(),
          narration: `Vendor Invoice from ${extractedData.extractedName || extractedData.vendorName} (GSTIN: ${extractedData.extractedGstin || extractedData.gstin})`,
          entries: []
        })
      });
      
      if (!res.ok) throw new Error('Failed to create voucher');
      
      setState('COMPLETE');
      
      // Redirect to the Unified Queue
      setTimeout(() => {
        router.push('/queue');
      }, 1500);
      
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'An unknown error occurred';
      alert('Approval failed: ' + message);
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

  if (state === 'FAILED') {
    return (
      <ReviewLayout title="Vendor Slip Upload Failed" subtitle={fileName}>
        <div className="flex-1 flex flex-col items-center justify-center h-full p-6">
          <div className="bg-red-50 border-l-4 border-red-400 p-4 w-full max-w-lg mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">
                  {errorMessage}
                </p>
              </div>
            </div>
          </div>
          <button 
            onClick={() => { setState('IDLE'); setProgress(0); setErrorMessage(''); }}
            className="bg-white border border-gray-300 text-gray-700 font-medium py-2 px-4 rounded shadow-sm text-sm"
          >
            Try Again
          </button>
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
            type={confidence > 0.8 ? "success" : "warning"} 
            title={confidence > 0.8 ? "High Confidence" : "Validation Warning"} 
            message={`AI extraction confidence is ${(confidence * 100).toFixed(0)}%. Please verify the selected vendor.`} 
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
            <input type="number" className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-1.5 px-3 text-sm bg-gray-50 dark:bg-gray-700 dark:text-white" defaultValue={extractedData.total || ''} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500">Tax Amount</label>
            <input type="number" className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-1.5 px-3 text-sm bg-gray-50 dark:bg-gray-700 dark:text-white" defaultValue={extractedData.tax || ''} />
          </div>
        </ReviewSection>

        <ReviewSection title="Accounting Mapping">
          <div>
            <label className="block text-xs font-medium text-gray-500 flex justify-between">
              Vendor Ledger
              <span className="text-yellow-600 text-[10px]">{candidateStatus === 'MAPPED' ? '100% Match' : 'Manual Mapping'}</span>
            </label>
            <select className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-1.5 px-3 text-sm bg-gray-50 dark:bg-gray-700 dark:text-white">
              <option>{extractedData.mappedVendorId ? `Mapped ID: ${extractedData.mappedVendorId}` : (extractedData.extractedName || 'Select vendor...')}</option>
              <option>ABC Suppliers Pvt Ltd</option>
              <option>ABC Corp</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500">Expense Ledger</label>
            <select className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-1.5 px-3 text-sm bg-gray-50 dark:bg-gray-700 dark:text-white">
              <option>{extractedData.mappedExpenseLedgerId ? `Mapped ID: ${extractedData.mappedExpenseLedgerId}` : 'Select ledger...'}</option>
              <option>Computer Equipment</option>
              <option>Cloud Hosting</option>
              <option>Miscellaneous</option>
            </select>
          </div>
        </ReviewSection>

        {extractedData.extractedData?.lineItems && extractedData.extractedData.lineItems.length > 0 && (
          <ReviewSection title="Line Items">
             <div className="space-y-2">
               {extractedData.extractedData.lineItems.map((item: LineItem, i: number) => (
                 <div key={i} className="text-xs border p-2 rounded bg-gray-50 dark:bg-gray-800">
                   <div className="font-medium">{item.description}</div>
                   <div className="flex justify-between text-gray-500 mt-1">
                     <span>Qty: {item.quantity || 1}</span>
                     <span>Rate: {item.rate || item.unitPrice || 0}</span>
                     <span>Total: {item.amount || item.totalPrice || 0}</span>
                   </div>
                 </div>
               ))}
             </div>
          </ReviewSection>
        )}

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
                onClick={() => { setState('IDLE'); setProgress(0); setErrorMessage(''); }}
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


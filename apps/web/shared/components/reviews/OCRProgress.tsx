import React from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';

export function OCRProgress({ stage, progress, message }: { stage: number, progress: number, message: string }) {
  return (
    <div className="w-full max-w-lg mx-auto bg-white dark:bg-gray-800 rounded-xl shadow p-8 text-center space-y-6">
      <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
        {progress < 100 ? (
          <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />
        ) : (
          <CheckCircle2 className="w-16 h-16 text-green-500" />
        )}
        <div className="absolute inset-0 flex items-center justify-center font-semibold text-sm">
          {progress}%
        </div>
      </div>
      
      <div>
        <h3 className="text-xl font-semibold mb-2 dark:text-gray-100">
          {progress < 100 ? 'Processing Document' : 'Data Extracted'}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 min-h-[20px]">
          {message}
        </p>
      </div>
      
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
        <div 
          className="bg-blue-500 h-2 transition-all duration-300 ease-out" 
          style={{ width: `${progress}%` }}
        />
      </div>
      
      <div className="flex justify-between text-xs text-gray-400">
        <span className={stage >= 1 ? "text-blue-500 font-medium" : ""}>Uploading</span>
        <span className={stage >= 2 ? "text-blue-500 font-medium" : ""}>OCR Scanning</span>
        <span className={stage >= 3 ? "text-blue-500 font-medium" : ""}>Data Extraction</span>
        <span className={stage >= 4 ? "text-blue-500 font-medium" : ""}>Validation</span>
      </div>
    </div>
  );
}

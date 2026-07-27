import React from 'react';
import { ZoomIn, ZoomOut, RotateCw, ChevronLeft, ChevronRight, Download } from 'lucide-react';

export function DocumentViewer({ fileUrl, fileName }: { fileUrl: string, fileName: string }) {
  return (
    <div className="flex-1 bg-gray-200 dark:bg-gray-800 rounded-lg shadow border border-gray-300 dark:border-gray-700 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="p-3 bg-gray-100 dark:bg-gray-900 border-b border-gray-300 dark:border-gray-700 flex justify-between items-center">
        <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate pr-4">{fileName}</span>
        <div className="flex items-center gap-1">
          <button className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-400">
            <ZoomOut className="w-4 h-4" />
          </button>
          <button className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-400">
            <ZoomIn className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1"></div>
          <button className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-400">
            <RotateCw className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1"></div>
          <button className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-400">
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Viewer Area */}
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-800/50 p-4 relative overflow-auto">
        <div className="bg-white w-full max-w-lg shadow-md border p-8 relative">
          {fileUrl ? (
            <img src={fileUrl} alt="Document Preview" className="w-full h-auto object-contain" />
          ) : (
             <div className="w-full aspect-[1/1.4] flex items-center justify-center text-gray-400 border border-dashed">
               Document Preview
             </div>
          )}
        </div>
        
        {/* Page Nav */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/70 text-white px-4 py-2 rounded-full text-sm backdrop-blur-sm">
          <button className="hover:text-gray-300"><ChevronLeft className="w-4 h-4" /></button>
          <span>Page 1 of 1</span>
          <button className="hover:text-gray-300"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  );
}

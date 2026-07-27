import React, { useCallback, useState } from 'react';
import { UploadCloud, FileType, Image as ImageIcon } from 'lucide-react';

export function UploadDropzone({ onUpload }: { onUpload: (file: File) => void }) {
  const [isDragging, setIsDragging] = useState(false);
  const handleDrag = useCallback((e: React.DragEvent) => { 
    e.preventDefault(); 
    e.stopPropagation(); 
    if (e.type === 'dragenter' || e.type === 'dragover') setIsDragging(true); 
    else if (e.type === 'dragleave') setIsDragging(false); 
  }, []);
  const handleDrop = useCallback((e: React.DragEvent) => { 
    e.preventDefault(); 
    e.stopPropagation(); 
    setIsDragging(false); 
    if (e.dataTransfer.files && e.dataTransfer.files[0]) { 
      onUpload(e.dataTransfer.files[0]); 
    } 
  }, [onUpload]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => { 
    if (e.target.files && e.target.files[0]) onUpload(e.target.files[0]); 
  };
  
  return (
    <div 
      className={`w-full max-w-2xl mx-auto p-12 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-colors ${isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'}`} 
      onDragEnter={handleDrag} 
      onDragLeave={handleDrag} 
      onDragOver={handleDrag} 
      onDrop={handleDrop}
    >
      <div className="p-4 bg-white dark:bg-gray-800 shadow-sm rounded-full mb-4">
        <UploadCloud className="w-10 h-10 text-blue-500" />
      </div>
      <h3 className="text-xl font-semibold mb-2 dark:text-gray-100">Drag & Drop Invoice Here</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Supported formats: PDF, PNG, JPG, JPEG</p>
      
      <div className="flex gap-4">
        <label className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          <FileType className="w-5 h-5 text-red-500" />
          <span className="font-medium text-sm dark:text-gray-200">Upload PDF</span>
          <input type="file" className="hidden" accept="application/pdf" onChange={handleChange} />
        </label>
        
        <label className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          <ImageIcon className="w-5 h-5 text-blue-500" />
          <span className="font-medium text-sm dark:text-gray-200">Upload Image</span>
          <input type="file" className="hidden" accept="image/jpeg, image/png" onChange={handleChange} />
        </label>
      </div>
    </div>
  );
}

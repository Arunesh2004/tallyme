import React from 'react';

export function ReviewSidebar({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full lg:w-[400px] flex flex-col space-y-4 overflow-y-auto pr-2 shrink-0">
      {children}
    </div>
  );
}

export function ReviewSection({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-5">
      <h3 className="text-md font-medium border-b border-gray-200 dark:border-gray-700 pb-2 mb-4 text-gray-900 dark:text-gray-100">
        {title}
      </h3>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}

export function ReviewStatusBadge({ 
  type, 
  title, 
  message 
}: { 
  type: 'warning' | 'success' | 'error' | 'info',
  title: string, 
  message: string 
}) {
  const colors = {
    warning: 'border-yellow-300 dark:border-yellow-700 text-yellow-700 dark:text-yellow-500 bg-yellow-50 dark:bg-yellow-900/10',
    success: 'border-green-300 dark:border-green-700 text-green-700 dark:text-green-500 bg-green-50 dark:bg-green-900/10',
    error: 'border-red-300 dark:border-red-700 text-red-700 dark:text-red-500 bg-red-50 dark:bg-red-900/10',
    info: 'border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-500 bg-blue-50 dark:bg-blue-900/10',
  };
  
  return (
    <div className={`shadow rounded-lg p-4 border ${colors[type]}`}>
      <h3 className="font-semibold text-sm mb-1">{title}</h3>
      <p className="text-sm opacity-90">{message}</p>
    </div>
  );
}

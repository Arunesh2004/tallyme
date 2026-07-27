import React from 'react';

export function ReviewLayout({ title, subtitle, children }: { title: string, subtitle?: React.ReactNode, children: React.ReactNode }) {
  return (
    <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex justify-between items-center shrink-0">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{title}</h1>
        {subtitle && <div className="text-sm text-gray-500">{subtitle}</div>}
      </div>
      
      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

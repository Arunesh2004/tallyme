import * as React from "react"

export function ConfigStatusBanner({ message, onClose }: { message: string | null; onClose: () => void }) {
  if (!message) return null;

  return (
    <div className="mb-6 rounded-md bg-green-50 dark:bg-green-900/20 p-4 border border-green-200 dark:border-green-900/30 flex items-start justify-between">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <p className="text-sm font-medium text-green-800 dark:text-green-300">{message}</p>
          <p className="text-xs text-green-700/80 dark:text-green-400/80 mt-1">
            Note: The backend runs in simulated mode. Values may revert on page reload.
          </p>
        </div>
      </div>
      <button onClick={onClose} className="text-green-500 hover:text-green-600">
        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  )
}

import { WifiOff } from "lucide-react";

interface ConnectionErrorProps {
  lastSync?: string | null;
  onRetry?: () => void;
}

export function ConnectionError({ lastSync, onRetry }: ConnectionErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center border rounded-lg bg-orange-500/10 dark:bg-orange-500/20 border-orange-500/50">
      <WifiOff className="h-10 w-10 text-orange-600 mb-4" />
      <h3 className="text-lg font-semibold text-orange-700 dark:text-orange-400">Tally Connection Failed</h3>
      <p className="text-sm text-orange-700/80 dark:text-orange-400/80 mt-2">
        We could not reach the Tally Prime instance or the ERP Connector.
      </p>
      {lastSync && (
        <p className="text-sm text-orange-700/80 dark:text-orange-400/80 mt-1">
          Last successful sync: {new Date(lastSync).toLocaleString()}
        </p>
      )}
      {onRetry && (
        <button 
          onClick={onRetry}
          className="mt-4 px-4 py-2 bg-orange-600 text-white shadow-sm rounded-md hover:bg-orange-700 text-sm font-medium transition-colors"
        >
          Retry Connection
        </button>
      )}
    </div>
  );
}

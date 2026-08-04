import * as React from "react"

export function ERPQueueCard({ statusData }: { statusData: any }) {
  if (!statusData) return null

  return (
    <div className="border rounded-lg bg-card p-6 shadow-sm">
      <h3 className="text-lg font-semibold mb-4">Queue Metrics</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-sm">
        <div className="flex flex-col space-y-1 p-3 bg-muted/30 rounded-md">
          <span className="text-muted-foreground">Total Queue Size</span>
          <span className="font-bold text-xl">{statusData.queueSize}</span>
        </div>
        <div className="flex flex-col space-y-1 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
          <span className="text-muted-foreground">Active Jobs</span>
          <span className="font-bold text-xl text-blue-700 dark:text-blue-400">{statusData.activeJobs}</span>
        </div>
        <div className="flex flex-col space-y-1 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
          <span className="text-muted-foreground">Waiting Jobs</span>
          <span className="font-bold text-xl text-yellow-700 dark:text-yellow-400">{statusData.waitingJobs}</span>
        </div>
        <div className="flex flex-col space-y-1 p-3 bg-red-50 dark:bg-red-900/20 rounded-md">
          <span className="text-muted-foreground">Failed Jobs</span>
          <span className="font-bold text-xl text-red-700 dark:text-red-400">{statusData.failedJobs}</span>
        </div>
        <div className="flex flex-col space-y-1 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-md">
          <span className="text-muted-foreground">Retry Count</span>
          <span className="font-bold text-xl text-orange-700 dark:text-orange-400">{statusData.retryCount}</span>
        </div>
      </div>
    </div>
  )
}

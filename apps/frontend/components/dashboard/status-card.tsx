import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, XCircle, AlertCircle } from "lucide-react"

export function StatusCard({
  name,
  status,
  details,
}: {
  name: string
  status: "up" | "down" | "degraded" | string
  details?: Record<string, any>
}) {
  const getStatusIcon = (s: string) => {
    switch (s.toLowerCase()) {
      case "up":
      case "healthy":
      case "ok":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "down":
      case "unhealthy":
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-md font-semibold">{name}</CardTitle>
        {getStatusIcon(status)}
      </CardHeader>
      <CardContent>
        <div className="text-sm font-medium capitalize mb-2">{status}</div>
        {details && Object.keys(details).length > 0 && (
          <div className="text-xs text-muted-foreground space-y-1">
            {Object.entries(details).map(([key, val]) => (
              <div key={key} className="flex justify-between">
                <span>{key}:</span>
                <span className="font-medium text-foreground">{String(val)}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

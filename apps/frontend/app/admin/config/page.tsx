"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { PageContainer } from "@/components/ui/page"
import { ErrorState } from "@/components/ui/states"
import { LoadingSpinner } from "@/components/ui/loading"
import { RefreshButton } from "@/components/dashboard/refresh-button"

import { AdminConfiguration, AdminConfigurationUpdateResponse } from "@/types/config"
import { ConfigSection } from "@/components/admin/config-section"
import { ConfigCard } from "@/components/admin/config-card"
import { ConfigSelect } from "@/components/admin/config-select"
import { ConfigNumberInput } from "@/components/admin/config-number-input"
import { ConfigSlider } from "@/components/admin/config-slider"
import { ConfigSaveBar } from "@/components/admin/config-save-bar"
import { ConfigStatusBanner } from "@/components/admin/config-status-banner"

export default function AdminConfigPage() {
  const queryClient = useQueryClient()
  
  const [formState, setFormState] = useState<AdminConfiguration | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const { data: config, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['admin-config'],
    queryFn: async () => {
      const { data } = await api.get<AdminConfiguration>('/admin/config')
      return data
    },
  })

  // Sync form state when server data loads
  useEffect(() => {
    if (config && !isDirty) {
      setFormState(JSON.parse(JSON.stringify(config)))
    }
  }, [config, isDirty])

  const mutation = useMutation({
    mutationFn: async (payload: AdminConfiguration) => {
      const { data } = await api.put<AdminConfigurationUpdateResponse>('/admin/config', payload)
      return data
    },
    onSuccess: (data) => {
      setSuccessMessage(data.message)
      setIsDirty(false)
      // Invalidate to fetch fresh (even if it's mocked on backend)
      queryClient.invalidateQueries({ queryKey: ['admin-config'] })
    }
  })

  const handleUpdate = <K extends keyof AdminConfiguration>(
    key: K, 
    value: AdminConfiguration[K]
  ) => {
    if (!formState) return
    setFormState({ ...formState, [key]: value })
    setIsDirty(true)
  }

  const handleNestedUpdate = <K extends keyof AdminConfiguration, NK extends keyof AdminConfiguration[K]>(
    parentKey: K,
    childKey: NK,
    value: AdminConfiguration[K][NK]
  ) => {
    if (!formState) return
    setFormState({
      ...formState,
      [parentKey]: {
        ...(formState[parentKey] as object),
        [childKey]: value
      }
    })
    setIsDirty(true)
  }

  const handleReset = () => {
    if (config) {
      setFormState(JSON.parse(JSON.stringify(config)))
      setIsDirty(false)
    }
  }

  const handleSave = () => {
    if (formState) {
      mutation.mutate(formState)
    }
  }

  return (
    <PageContainer>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">System Configuration</h1>
          <p className="text-muted-foreground mt-1">Manage global application settings and integration limits.</p>
        </div>
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <RefreshButton onRefresh={() => {
            handleReset()
            refetch()
          }} isRefreshing={isFetching} />
        </div>
      </div>

      <ConfigStatusBanner message={successMessage} onClose={() => setSuccessMessage(null)} />

      {error ? (
        <ErrorState 
          title="Failed to load configuration" 
          message={error instanceof Error ? error.message : "An unknown error occurred"} 
          onRetry={refetch} 
        />
      ) : isLoading || !formState ? (
        <div className="flex justify-center items-center h-64 border rounded-lg bg-card text-muted-foreground">
          <LoadingSpinner className="mr-3" /> Loading configuration...
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
          
          <ConfigSection title="Integrations" description="Manage external service providers and connectivity.">
            <ConfigCard label="OCR Provider" description="Primary engine for extracting text from invoices.">
              <ConfigSelect 
                value={formState.ocrProvider} 
                onChange={(v) => handleUpdate('ocrProvider', v)}
                options={[
                  { label: "Azure Document Intelligence", value: "AZURE_DOCUMENT_INTELLIGENCE" },
                  { label: "Google Cloud Vision", value: "GOOGLE_CLOUD_VISION" },
                  { label: "AWS Textract", value: "AWS_TEXTRACT" }
                ]}
              />
            </ConfigCard>
            <ConfigCard label="AI Provider" description="LLM used for intelligent matching and ledger routing.">
              <ConfigSelect 
                value={formState.aiProvider} 
                onChange={(v) => handleUpdate('aiProvider', v)}
                options={[
                  { label: "OpenAI (GPT-4)", value: "OPENAI" },
                  { label: "Anthropic (Claude 3)", value: "ANTHROPIC" },
                  { label: "Google (Gemini)", value: "GOOGLE" }
                ]}
              />
            </ConfigCard>
            <ConfigCard label="Gmail Integration" description="Status of the automated mailbox polling service.">
              <ConfigSelect 
                value={formState.gmailIntegration} 
                onChange={(v) => handleUpdate('gmailIntegration', v)}
                options={[
                  { label: "Connected (Polling Active)", value: "CONNECTED" },
                  { label: "Disconnected (Disabled)", value: "DISCONNECTED" }
                ]}
              />
            </ConfigCard>
          </ConfigSection>

          <ConfigSection title="Processing Limits" description="Configure retry boundaries for automated background jobs.">
            <ConfigCard label="ERP Sync Retries" description="Maximum attempts to push a voucher to Tally before failing.">
              <ConfigNumberInput 
                value={formState.retryLimits.erpSync} 
                onChange={(v) => handleNestedUpdate('retryLimits', 'erpSync', v)}
                min={1} max={10}
              />
            </ConfigCard>
            <ConfigCard label="Email Processing Retries" description="Maximum attempts to parse a vendor email.">
              <ConfigNumberInput 
                value={formState.retryLimits.emailProcessing} 
                onChange={(v) => handleNestedUpdate('retryLimits', 'emailProcessing', v)}
                min={1} max={10}
              />
            </ConfigCard>
          </ConfigSection>

          <ConfigSection title="Intelligence Thresholds" description="Confidence scores required for automated decision making.">
            <ConfigCard label="Vendor Matching" description="Minimum confidence to auto-approve vendor slip extraction.">
              <ConfigSlider 
                value={formState.matchingThresholds.vendor} 
                onChange={(v) => handleNestedUpdate('matchingThresholds', 'vendor', v)}
                min={0.5} max={1.0} step={0.01}
              />
            </ConfigCard>
            <ConfigCard label="Student Matching" description="Minimum confidence to map a payment to a student ledger.">
              <ConfigSlider 
                value={formState.matchingThresholds.student} 
                onChange={(v) => handleNestedUpdate('matchingThresholds', 'student', v)}
                min={0.5} max={1.0} step={0.01}
              />
            </ConfigCard>
          </ConfigSection>

          <ConfigSection title="System Resources" description="Manage worker concurrency and API rate limits.">
            <ConfigCard label="Max Active Jobs" description="Total concurrent BullMQ jobs processing at once.">
              <ConfigNumberInput 
                value={formState.queueLimits.maxActiveJobs} 
                onChange={(v) => handleNestedUpdate('queueLimits', 'maxActiveJobs', v)}
                min={10} max={200} step={10}
              />
            </ConfigCard>
            <ConfigCard label="Rate Limit" description="Maximum external API calls per minute.">
              <ConfigNumberInput 
                value={formState.queueLimits.rateLimit} 
                onChange={(v) => handleNestedUpdate('queueLimits', 'rateLimit', v)}
                min={10} max={1000} step={10}
              />
            </ConfigCard>
          </ConfigSection>
        </div>
      )}

      <ConfigSaveBar 
        isDirty={isDirty} 
        isSaving={mutation.isPending} 
        onSave={handleSave} 
        onReset={handleReset} 
      />
    </PageContainer>
  )
}

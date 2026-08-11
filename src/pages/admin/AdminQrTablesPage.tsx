import { useCallback, useEffect, useState } from 'react'
import { Plus, QrCode, Trash2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Input } from '@/components/ui/Input'
import { LoadingState } from '@/components/ui/LoadingState'
import { Select } from '@/components/ui/Select'
import * as branchService from '@/services/branchService'
import * as qrTableService from '@/services/qrTableService'
import type { QrTableWithBranch } from '@/services/qrTableService'
import type { Branch } from '@/types/Branch'

interface CreateQrFormValues {
  branchId: string
  label: string
}

export default function AdminQrTablesPage() {
  const [qrTables, setQrTables] = useState<QrTableWithBranch[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateQrFormValues>({
    defaultValues: {
      branchId: '',
      label: '',
    },
  })

  const refetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    const [tablesResult, branchesResult] = await Promise.all([
      qrTableService.getQrTables(),
      branchService.getAllBranches(),
    ])

    if (tablesResult.success) {
      setQrTables(tablesResult.data)
    } else {
      setError(tablesResult.message)
      setQrTables([])
    }

    if (branchesResult.success) {
      setBranches(branchesResult.data)
    }

    setIsLoading(false)
  }, [])

  useEffect(() => {
    void refetch()
  }, [refetch])

  const onCreate = async (values: CreateQrFormValues) => {
    setIsSubmitting(true)

    const result = await qrTableService.createQrTable({
      branchId: values.branchId,
      label: values.label,
    })

    setIsSubmitting(false)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    toast.success('QR table created')
    reset()
    void refetch()
  }

  const handleToggleActive = async (table: QrTableWithBranch) => {
    setUpdatingId(table.id)

    const result = await qrTableService.setQrTableActive(
      table.id,
      !table.is_active,
    )

    setUpdatingId(null)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    toast.success(table.is_active ? 'QR table deactivated' : 'QR table activated')
    void refetch()
  }

  const handleDelete = async (table: QrTableWithBranch) => {
    if (!window.confirm(`Delete QR table "${table.label}"?`)) return

    setUpdatingId(table.id)

    const result = await qrTableService.deleteQrTable(table.id)

    setUpdatingId(null)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    toast.success('QR table deleted')
    void refetch()
  }

  const branchOptions = branches.map((branch) => ({
    label: branch.name,
    value: branch.id,
  }))

  return (
    <div className="space-y-6">
      <section className="rounded-[var(--radius-card)] bg-surface p-5 shadow-md">
        <h3 className="text-lg font-semibold text-text-primary">Create QR Table</h3>
        <form
          onSubmit={handleSubmit(onCreate)}
          className="mt-4 grid gap-4 sm:grid-cols-[1fr_1fr_auto]"
          noValidate
        >
          <Select
            label="Branch"
            placeholder="Select branch"
            options={branchOptions}
            error={errors.branchId?.message}
            {...register('branchId', { required: 'Branch is required' })}
          />
          <Input
            label="Table Label"
            placeholder="e.g. Table 12"
            error={errors.label?.message}
            {...register('label', { required: 'Label is required' })}
          />
          <div className="flex items-end">
            <Button type="submit" disabled={isSubmitting}>
              <Plus className="h-4 w-4" />
              {isSubmitting ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </form>
      </section>

      {isLoading && <LoadingState variant="inline" />}

      {!isLoading && error && (
        <ErrorState message={error} onRetry={() => void refetch()} />
      )}

      {!isLoading && !error && qrTables.length === 0 && (
        <EmptyState
          title="No QR tables yet"
          description="Create a QR table to generate scan-to-order codes."
          icon={QrCode}
        />
      )}

      {!isLoading && !error && qrTables.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {qrTables.map((table) => {
            const menuUrl = qrTableService.buildQrMenuUrl(table.table_code)
            const qrImageUrl = qrTableService.buildQrImageUrl(menuUrl)

            return (
              <article
                key={table.id}
                className="rounded-[var(--radius-card)] bg-surface p-5 shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-text-primary">
                      {table.label}
                    </h3>
                    <p className="mt-1 text-sm text-text-secondary">
                      {table.branch.name}
                    </p>
                    <p className="mt-1 font-mono text-xs text-text-secondary">
                      {table.table_code}
                    </p>
                  </div>
                  <Badge variant={table.is_active ? 'veg' : 'unavailable'}>
                    {table.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                <img
                  src={qrImageUrl}
                  alt={`QR code for ${table.label}`}
                  className="mx-auto mt-4 h-40 w-40 rounded-md border border-black/5 bg-white p-2"
                />

                <p className="mt-3 break-all text-center text-xs text-text-secondary">
                  {menuUrl}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={updatingId === table.id}
                    onClick={() => void handleToggleActive(table)}
                  >
                    {table.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    disabled={updatingId === table.id}
                    onClick={() => void handleDelete(table)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

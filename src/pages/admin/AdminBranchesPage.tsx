import { useCallback, useEffect, useState } from 'react'
import { Plus, Pencil } from 'lucide-react'
import { BranchFormModal } from '@/components/admin/BranchFormModal'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import * as branchService from '@/services/branchService'
import type { Branch } from '@/types/Branch'
import { formatBranchAddress } from '@/utils/mapBranch'

export default function AdminBranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null)

  const refetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    const result = await branchService.getAllBranches()

    if (result.success) {
      setBranches(result.data)
    } else {
      setError(result.message)
      setBranches([])
    }

    setIsLoading(false)
  }, [])

  useEffect(() => {
    void refetch()
  }, [refetch])

  const openCreateModal = () => {
    setEditingBranch(null)
    setIsFormOpen(true)
  }

  const openEditModal = (branch: Branch) => {
    setEditingBranch(branch)
    setIsFormOpen(true)
  }

  const closeFormModal = () => {
    setIsFormOpen(false)
    setEditingBranch(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={openCreateModal} className="shrink-0">
          <Plus className="h-4 w-4" />
          Add Branch
        </Button>
      </div>

      {isLoading && <LoadingState variant="inline" />}

      {!isLoading && error && (
        <ErrorState message={error} onRetry={() => void refetch()} />
      )}

      {!isLoading && !error && branches.length === 0 && (
        <EmptyState
          title="No branches yet"
          description="Create your first branch location."
          actionLabel="Add Branch"
          onAction={openCreateModal}
        />
      )}

      {!isLoading && !error && branches.length > 0 && (
        <div className="overflow-x-auto rounded-[var(--radius-card)] bg-surface shadow-md">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-black/5 bg-background/60">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Slug</th>
                <th className="px-4 py-3 font-semibold">Address</th>
                <th className="px-4 py-3 font-semibold">GSTIN</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {branches.map((branch) => (
                <tr key={branch.id} className="border-b border-black/5">
                  <td className="px-4 py-3 font-medium text-text-primary">
                    {branch.name}
                    {branch.is_default && (
                      <Badge variant="featured" className="ml-2">
                        Default
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{branch.slug}</td>
                  <td className="max-w-xs px-4 py-3 text-text-secondary">
                    {formatBranchAddress(branch)}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {branch.gstin ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={branch.is_active ? 'veg' : 'unavailable'}>
                      {branch.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal(branch)}
                    >
                      <Pencil className="h-4 w-4" />
                      Edit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <BranchFormModal
        isOpen={isFormOpen}
        branch={editingBranch}
        onClose={closeFormModal}
        onSuccess={() => void refetch()}
      />
    </div>
  )
}

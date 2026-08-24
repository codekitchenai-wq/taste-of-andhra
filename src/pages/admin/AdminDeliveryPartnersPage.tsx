import { useCallback, useEffect, useMemo, useState } from 'react'
import { KeyRound, Pencil, Plus, Trash2 } from 'lucide-react'
import { DeliveryPartnerFormModal } from '@/components/admin/DeliveryPartnerFormModal'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Input } from '@/components/ui/Input'
import { LoadingState } from '@/components/ui/LoadingState'
import { Modal } from '@/components/ui/Modal'
import { MIN_PASSWORD_LENGTH } from '@/constants/AUTH'
import toast from 'react-hot-toast'
import * as branchService from '@/services/branchService'
import * as deliveryPartnerService from '@/services/deliveryPartnerService'
import type { Branch } from '@/types/Branch'
import type { DeliveryPartner } from '@/types/DeliveryPartner'
import { formatIndianPhone } from '@/utils/phone'

export default function AdminDeliveryPartnersPage() {
  const [partners, setPartners] = useState<DeliveryPartner[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingPartner, setEditingPartner] = useState<DeliveryPartner | null>(
    null,
  )
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [passwordPartner, setPasswordPartner] =
    useState<DeliveryPartner | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [isSavingPassword, setIsSavingPassword] = useState(false)

  const branchNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const branch of branches) {
      map.set(branch.id, branch.name)
    }
    return map
  }, [branches])

  const refetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    const [partnersResult, branchesResult] = await Promise.all([
      deliveryPartnerService.getDeliveryPartners(),
      branchService.getAllBranches(),
    ])

    if (partnersResult.success) {
      setPartners(partnersResult.data)
    } else {
      setError(partnersResult.message)
      setPartners([])
    }

    if (branchesResult.success) {
      setBranches(branchesResult.data)
    }

    setIsLoading(false)
  }, [])

  useEffect(() => {
    void refetch()
  }, [refetch])

  const openCreateModal = () => {
    setEditingPartner(null)
    setIsFormOpen(true)
  }

  const openEditModal = (partner: DeliveryPartner) => {
    setEditingPartner(partner)
    setIsFormOpen(true)
  }

  const closeFormModal = () => {
    setIsFormOpen(false)
    setEditingPartner(null)
  }

  const handleToggleActive = async (partner: DeliveryPartner) => {
    setUpdatingId(partner.id)

    const result = await deliveryPartnerService.setDeliveryPartnerActive(
      partner.id,
      !partner.is_active,
    )

    setUpdatingId(null)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    toast.success(
      partner.is_active
        ? 'Partner deactivated (cannot sign in or be assigned)'
        : 'Partner activated',
    )
    void refetch()
  }

  const handleDelete = async (partner: DeliveryPartner) => {
    const loginNote = partner.has_login
      ? ' This also deletes their delivery login.'
      : ''
    if (
      !window.confirm(
        `Remove delivery partner "${partner.full_name}"?${loginNote}`,
      )
    ) {
      return
    }

    setUpdatingId(partner.id)

    const result = await deliveryPartnerService.deleteDeliveryPartner(partner.id)

    setUpdatingId(null)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    toast.success('Delivery partner removed')
    void refetch()
  }

  const handleSavePassword = async () => {
    if (!passwordPartner) return
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      toast.error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
      return
    }

    setIsSavingPassword(true)
    const result = await deliveryPartnerService.setDeliveryPartnerPassword(
      passwordPartner.id,
      newPassword,
    )
    setIsSavingPassword(false)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    toast.success('Password updated')
    setPasswordPartner(null)
    setNewPassword('')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <p className="max-w-2xl text-sm text-text-secondary">
          Add partners with a login email and password. They sign in at{' '}
          <span className="font-medium text-text-primary">/delivery/login</span>
          . Use the same phone on the roster and the login so assigned jobs
          appear.
        </p>
        <Button onClick={openCreateModal} className="shrink-0">
          <Plus className="h-4 w-4" />
          Add Partner
        </Button>
      </div>

      {isLoading && <LoadingState variant="inline" />}

      {!isLoading && error && (
        <ErrorState message={error} onRetry={() => void refetch()} />
      )}

      {!isLoading && !error && partners.length === 0 && (
        <EmptyState
          title="No delivery partners yet"
          description="Add a partner with name, phone, login email, and password."
          actionLabel="Add Partner"
          onAction={openCreateModal}
        />
      )}

      {!isLoading && !error && partners.length > 0 && (
        <div className="overflow-x-auto rounded-[var(--radius-card)] bg-surface shadow-md">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b border-black/5 bg-background/60">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Phone</th>
                <th className="px-4 py-3 font-semibold">Login Email</th>
                <th className="px-4 py-3 font-semibold">Branch</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {partners.map((partner) => (
                <tr
                  key={partner.id}
                  className="border-b border-black/5 last:border-b-0"
                >
                  <td className="px-4 py-3 font-medium text-text-primary">
                    {partner.full_name}
                    {partner.notes ? (
                      <p className="mt-0.5 text-xs font-normal text-text-secondary">
                        {partner.notes}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {formatIndianPhone(partner.phone)}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {partner.login_email ?? (
                      <span className="text-error">No login</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {partner.branch_id
                      ? (branchNameById.get(partner.branch_id) ?? 'Unknown')
                      : 'All branches'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={partner.is_active ? 'veg' : 'unavailable'}>
                      {partner.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={updatingId === partner.id}
                        onClick={() => openEditModal(partner)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                      {partner.has_login ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={updatingId === partner.id}
                          onClick={() => {
                            setPasswordPartner(partner)
                            setNewPassword('')
                          }}
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                          Password
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={updatingId === partner.id}
                        onClick={() => void handleToggleActive(partner)}
                      >
                        {partner.is_active ? 'Disable' : 'Enable'}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="danger"
                        disabled={updatingId === partner.id}
                        onClick={() => void handleDelete(partner)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <DeliveryPartnerFormModal
        isOpen={isFormOpen}
        partner={editingPartner}
        onClose={closeFormModal}
        onSuccess={() => void refetch()}
      />

      <Modal
        isOpen={Boolean(passwordPartner)}
        onClose={() => {
          setPasswordPartner(null)
          setNewPassword('')
        }}
        title={
          passwordPartner
            ? `Change password · ${passwordPartner.full_name}`
            : 'Change password'
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Login:{' '}
            <span className="font-medium text-text-primary">
              {passwordPartner?.login_email ?? '—'}
            </span>
          </p>
          <Input
            label="New password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
          />
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setPasswordPartner(null)
                setNewPassword('')
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isSavingPassword}
              onClick={() => void handleSavePassword()}
            >
              {isSavingPassword ? 'Saving...' : 'Update Password'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

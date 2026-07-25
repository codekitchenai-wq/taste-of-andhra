import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { Branch } from '@/types/Branch'
import * as branchService from '@/services/branchService'

const STORAGE_KEY = 'toa_selected_branch_id'

interface BranchContextValue {
  branches: Branch[]
  selectedBranch: Branch | null
  isLoading: boolean
  setSelectedBranchId: (id: string) => void
  refresh: () => Promise<void>
}

const BranchContext = createContext<BranchContextValue | null>(null)

export function BranchProvider({ children }: { children: ReactNode }) {
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refresh = async () => {
    setIsLoading(true)
    const result = await branchService.getActiveBranches()
    setIsLoading(false)

    if (!result.success) {
      setBranches([])
      setSelectedBranch(null)
      return
    }

    setBranches(result.data)
    const storedId = localStorage.getItem(STORAGE_KEY)
    const preferred =
      result.data.find((b) => b.id === storedId) ??
      result.data.find((b) => b.is_default) ??
      result.data[0] ??
      null
    setSelectedBranch(preferred)
  }

  useEffect(() => {
    void refresh()
  }, [])

  const setSelectedBranchId = (id: string) => {
    const branch = branches.find((b) => b.id === id) ?? null
    setSelectedBranch(branch)
    if (branch) {
      localStorage.setItem(STORAGE_KEY, branch.id)
    }
  }

  return (
    <BranchContext.Provider
      value={{
        branches,
        selectedBranch,
        isLoading,
        setSelectedBranchId,
        refresh,
      }}
    >
      {children}
    </BranchContext.Provider>
  )
}

export function useBranch() {
  const ctx = useContext(BranchContext)
  if (!ctx) {
    throw new Error('useBranch must be used within BranchProvider')
  }
  return ctx
}

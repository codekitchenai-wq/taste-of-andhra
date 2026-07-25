import { useBranch } from '@/contexts/BranchContext'

export function useSelectedBranch() {
  return useBranch()
}

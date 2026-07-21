import { useCallback, useEffect, useState } from 'react'
import * as partyInquiryService from '@/services/partyInquiryService'
import type { PartyInquiry } from '@/types/PartyInquiry'

export function useAdminPartyInquiries() {
  const [inquiries, setInquiries] = useState<PartyInquiry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    const result = await partyInquiryService.getAllPartyInquiries()

    if (result.success) {
      setInquiries(result.data)
    } else {
      setError(result.message)
      setInquiries([])
    }

    setIsLoading(false)
  }, [])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { inquiries, isLoading, error, refetch }
}

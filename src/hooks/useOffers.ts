import { useQuery } from '@/hooks/useQuery'
import * as offerService from '@/services/offerService'

export function useOffers() {
  const { data, isLoading, error, refetch } = useQuery(() =>
    offerService.getAllOffers(),
  )

  return { offers: data ?? [], isLoading, error, refetch }
}

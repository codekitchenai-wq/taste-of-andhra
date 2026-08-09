import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from '@/hooks/useAuth'
import * as cartService from '@/services/cartService'
import type { ServiceResponse } from '@/types/api'
import type { CartWithItems } from '@/types/Cart'
import { getCartItemCount } from '@/utils/mapCart'

export interface CartContextValue {
  cart: CartWithItems | null
  isLoading: boolean
  isUpdating: boolean
  itemCount: number
  subtotal: number
  refreshCart: () => Promise<void>
  addItem: (
    dishId: string,
    quantity?: number,
    selectedModifierIds?: string[],
  ) => Promise<ServiceResponse<CartWithItems>>
  removeItem: (cartItemId: string) => Promise<ServiceResponse<CartWithItems>>
  updateQuantity: (
    cartItemId: string,
    quantity: number,
  ) => Promise<ServiceResponse<CartWithItems>>
  clearCart: () => Promise<ServiceResponse<null>>
}

export const CartContext = createContext<CartContextValue | null>(null)

interface CartProviderProps {
  children: ReactNode
}

export function CartProvider({ children }: CartProviderProps) {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth()
  const [cart, setCart] = useState<CartWithItems | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  const refreshCart = useCallback(async () => {
    if (!isAuthenticated) {
      setCart(null)
      return
    }

    setIsLoading(true)

    const result = await cartService.getCart()

    if (result.success) {
      setCart(result.data)
    } else {
      setCart(null)
    }

    setIsLoading(false)
  }, [isAuthenticated])

  useEffect(() => {
    if (isAuthLoading) return

    void refreshCart()
  }, [isAuthLoading, refreshCart])

  const addItem = useCallback(
    async (dishId: string, quantity = 1, selectedModifierIds: string[] = []) => {
      setIsUpdating(true)

      const result = await cartService.addCartItem(
        dishId,
        quantity,
        selectedModifierIds,
      )

      if (result.success) {
        setCart(result.data)
      }

      setIsUpdating(false)
      return result
    },
    [],
  )

  const removeItem = useCallback(async (cartItemId: string) => {
    setIsUpdating(true)

    const result = await cartService.removeCartItem(cartItemId)

    if (result.success) {
      setCart(result.data)
    }

    setIsUpdating(false)
    return result
  }, [])

  const updateQuantity = useCallback(
    async (cartItemId: string, quantity: number) => {
      setIsUpdating(true)

      const result = await cartService.updateCartItemQuantity(
        cartItemId,
        quantity,
      )

      if (result.success) {
        setCart(result.data)
      }

      setIsUpdating(false)
      return result
    },
    [],
  )

  const clearCart = useCallback(async () => {
    setIsUpdating(true)

    const result = await cartService.clearCart()

    if (result.success) {
      setCart((current) =>
        current ? { ...current, items: [], subtotal: 0 } : null,
      )
    }

    setIsUpdating(false)
    return result
  }, [])

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      isLoading: isAuthLoading || isLoading,
      isUpdating,
      itemCount: getCartItemCount(cart),
      subtotal: cart?.subtotal ?? 0,
      refreshCart,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
    }),
    [
      cart,
      isAuthLoading,
      isLoading,
      isUpdating,
      refreshCart,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
    ],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

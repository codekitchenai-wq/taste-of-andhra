import { useEffect, useMemo, useState } from 'react'
import { Minus, Plus, Search, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingState } from '@/components/ui/LoadingState'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { ROUTES } from '@/constants/ROUTES'
import * as branchService from '@/services/branchService'
import * as customerService from '@/services/customerService'
import * as dishService from '@/services/dishService'
import * as orderService from '@/services/orderService'
import type { Address } from '@/types/Address'
import type { Branch } from '@/types/Branch'
import type { FulfillmentType } from '@/types/enums'
import type { Profile } from '@/types/Profile'
import type { DishWithCategory } from '@/utils/mapDish'
import { formatAddressLine } from '@/utils/mapAddress'
import { calculateOrderTotals, defaultDeliveryCharge } from '@/utils/orderTotals'
import { formatPrice } from '@/utils/format'
import { isValidPhone } from '@/utils/validation'

interface DraftItem {
  key: string
  dishId: string
  name: string
  unitPrice: number
  quantity: number
}

export default function AdminPhoneOrderPage() {
  const navigate = useNavigate()
  const [dishes, setDishes] = useState<DishWithCategory[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [isLoadingMenu, setIsLoadingMenu] = useState(true)
  const [dishSearch, setDishSearch] = useState('')
  const [phone, setPhone] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [matchedCustomer, setMatchedCustomer] = useState<Profile | null>(null)
  const [addresses, setAddresses] = useState<Address[]>([])
  const [addressId, setAddressId] = useState('')
  const [fulfillmentType, setFulfillmentType] =
    useState<FulfillmentType>('delivery')
  const [branchId, setBranchId] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<DraftItem[]>([])
  const [isLookingUp, setIsLookingUp] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [guestLine1, setGuestLine1] = useState('')
  const [guestLine2, setGuestLine2] = useState('')
  const [guestLandmark, setGuestLandmark] = useState('')
  const [guestCity, setGuestCity] = useState('Bangalore')
  const [guestState, setGuestState] = useState('Karnataka')
  const [guestPincode, setGuestPincode] = useState('')

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setIsLoadingMenu(true)
      const [dishesResult, branchesResult] = await Promise.all([
        dishService.getAllDishes(),
        branchService.getAllBranches(),
      ])
      if (cancelled) return

      if (dishesResult.success) {
        setDishes(dishesResult.data.filter((dish) => dish.is_available))
      } else {
        toast.error(dishesResult.message)
      }

      if (branchesResult.success) {
        setBranches(branchesResult.data)
        const defaultBranch =
          branchesResult.data.find((branch) => branch.is_default) ??
          branchesResult.data[0]
        if (defaultBranch) setBranchId(defaultBranch.id)
      }

      setIsLoadingMenu(false)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const filteredDishes = useMemo(() => {
    const query = dishSearch.trim().toLowerCase()
    if (!query) return dishes
    return dishes.filter(
      (dish) =>
        dish.name.toLowerCase().includes(query) ||
        dish.category_name.toLowerCase().includes(query),
    )
  }, [dishes, dishSearch])

  const subtotal = items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  )
  const deliveryCharge =
    fulfillmentType === 'pickup' ? 0 : defaultDeliveryCharge(subtotal)
  const totals = calculateOrderTotals(subtotal, 0, deliveryCharge)

  const handleLookup = async () => {
    if (!isValidPhone(phone)) {
      toast.error('Enter a valid 10-digit phone number.')
      return
    }

    setIsLookingUp(true)
    const result = await customerService.findCustomerByPhone(phone)
    setIsLookingUp(false)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    if (!result.data) {
      setMatchedCustomer(null)
      setAddresses([])
      setAddressId('')
      toast.success('No existing customer — continue as guest.')
      return
    }

    setMatchedCustomer(result.data)
    setCustomerName(result.data.full_name)
    const addressResult = await customerService.getCustomerAddresses(
      result.data.id,
    )
    if (addressResult.success) {
      setAddresses(addressResult.data)
      const preferred =
        addressResult.data.find((address) => address.is_default) ??
        addressResult.data[0]
      setAddressId(preferred?.id ?? '')
    } else {
      setAddresses([])
      setAddressId('')
    }
    toast.success(`Matched ${result.data.full_name}`)
  }

  const addDish = (dish: DishWithCategory) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.dishId === dish.id)
      if (existing) {
        return prev.map((item) =>
          item.key === existing.key
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        )
      }

      return [
        ...prev,
        {
          key: `${dish.id}-${Date.now()}`,
          dishId: dish.id,
          name: dish.name,
          unitPrice: Number(dish.price),
          quantity: 1,
        },
      ]
    })
  }

  const updateQty = (key: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((item) =>
          item.key === key
            ? { ...item, quantity: item.quantity + delta }
            : item,
        )
        .filter((item) => item.quantity > 0),
    )
  }

  const handleSubmit = async () => {
    if (!isValidPhone(phone)) {
      toast.error('Enter a valid 10-digit phone number.')
      return
    }
    if (!customerName.trim()) {
      toast.error('Customer name is required.')
      return
    }
    if (items.length === 0) {
      toast.error('Add at least one dish.')
      return
    }

    setIsSubmitting(true)
    const result = await orderService.createPhoneOrder({
      customerName,
      customerPhone: phone.trim(),
      userId: matchedCustomer?.id ?? null,
      fulfillmentType,
      addressId:
        fulfillmentType === 'delivery' && addressId ? addressId : null,
      guestAddress:
        fulfillmentType === 'delivery' && !addressId
          ? {
              line1: guestLine1,
              line2: guestLine2,
              landmark: guestLandmark,
              city: guestCity,
              state: guestState,
              pincode: guestPincode,
            }
          : null,
      branchId: branchId || null,
      specialInstructions: notes,
      items: items.map((item) => ({
        dishId: item.dishId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        dishName: item.name,
      })),
      deliveryCharge,
    })
    setIsSubmitting(false)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    toast.success(`Phone order ${result.data.order_number} placed`)
    navigate(ROUTES.ADMIN.ORDERS)
  }

  if (isLoadingMenu) {
    return <LoadingState />
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Phone Order</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Create an order from a phone call. It joins the kitchen queue; payment
          is collected later via UPI QR.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="space-y-4 rounded-[var(--radius-card)] bg-surface p-5 shadow-md">
          <h3 className="font-semibold text-text-primary">Customer</h3>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <Input
              label="Mobile number"
              inputMode="numeric"
              maxLength={10}
              value={phone}
              onChange={(event) => setPhone(event.target.value.replace(/\D/g, ''))}
              placeholder="10-digit mobile"
            />
            <div className="flex items-end">
              <Button
                type="button"
                variant="secondary"
                onClick={() => void handleLookup()}
                disabled={isLookingUp}
              >
                {isLookingUp ? 'Looking up…' : 'Look up'}
              </Button>
            </div>
          </div>
          <Input
            label="Customer name"
            value={customerName}
            onChange={(event) => setCustomerName(event.target.value)}
            placeholder="Name as on the call"
          />
          {matchedCustomer && (
            <p className="rounded-[var(--radius-input)] bg-success/10 px-3 py-2 text-sm text-text-primary">
              Linked to existing customer {matchedCustomer.full_name}
              {matchedCustomer.email ? ` · ${matchedCustomer.email}` : ''}
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              label="Fulfillment"
              value={fulfillmentType}
              onChange={(event) =>
                setFulfillmentType(event.target.value as FulfillmentType)
              }
              options={[
                { label: 'Delivery', value: 'delivery' },
                { label: 'Pickup', value: 'pickup' },
              ]}
            />
            <Select
              label="Branch"
              value={branchId}
              onChange={(event) => setBranchId(event.target.value)}
              options={[
                { label: 'Select branch', value: '' },
                ...branches.map((branch) => ({
                  label: branch.name,
                  value: branch.id,
                })),
              ]}
            />
          </div>

          {fulfillmentType === 'delivery' && (
            <div className="space-y-3 border-t border-black/5 pt-4">
              <h4 className="text-sm font-semibold text-text-primary">
                Delivery address
              </h4>
              {addresses.length > 0 ? (
                <Select
                  label="Saved address"
                  value={addressId}
                  onChange={(event) => setAddressId(event.target.value)}
                  options={[
                    { label: 'Enter a new address', value: '' },
                    ...addresses.map((address) => ({
                      label: `${address.full_name} — ${formatAddressLine(address)}`,
                      value: address.id,
                    })),
                  ]}
                />
              ) : null}

              {!addressId && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    label="Address line 1"
                    value={guestLine1}
                    onChange={(event) => setGuestLine1(event.target.value)}
                    className="sm:col-span-2"
                  />
                  <Input
                    label="Address line 2"
                    value={guestLine2}
                    onChange={(event) => setGuestLine2(event.target.value)}
                    className="sm:col-span-2"
                  />
                  <Input
                    label="Landmark"
                    value={guestLandmark}
                    onChange={(event) => setGuestLandmark(event.target.value)}
                    className="sm:col-span-2"
                  />
                  <Input
                    label="City"
                    value={guestCity}
                    onChange={(event) => setGuestCity(event.target.value)}
                  />
                  <Input
                    label="State"
                    value={guestState}
                    onChange={(event) => setGuestState(event.target.value)}
                  />
                  <Input
                    label="Pincode"
                    value={guestPincode}
                    onChange={(event) =>
                      setGuestPincode(event.target.value.replace(/\D/g, '').slice(0, 6))
                    }
                    inputMode="numeric"
                    maxLength={6}
                  />
                </div>
              )}
            </div>
          )}

          <Textarea
            label="Special instructions"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            placeholder="Spice level, no onion, call on arrival…"
          />
        </section>

        <section className="space-y-4 rounded-[var(--radius-card)] bg-surface p-5 shadow-md">
          <h3 className="font-semibold text-text-primary">Order summary</h3>
          {items.length === 0 ? (
            <p className="text-sm text-text-secondary">
              Add dishes from the menu below.
            </p>
          ) : (
            <ul className="divide-y divide-black/5">
              {items.map((item) => (
                <li
                  key={item.key}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-text-primary">
                      {item.name}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {formatPrice(item.unitPrice)} each
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="rounded-full border border-black/10 p-1"
                      onClick={() => updateQty(item.key, -1)}
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-6 text-center text-sm font-semibold">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      className="rounded-full border border-black/10 p-1"
                      onClick={() => updateQty(item.key, 1)}
                      aria-label="Increase quantity"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      className="rounded-full p-1 text-error"
                      onClick={() =>
                        setItems((prev) =>
                          prev.filter((row) => row.key !== item.key),
                        )
                      }
                      aria-label="Remove item"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <dl className="space-y-1 text-sm">
            <div className="flex justify-between text-text-secondary">
              <dt>Subtotal</dt>
              <dd>{formatPrice(totals.subtotal)}</dd>
            </div>
            <div className="flex justify-between text-text-secondary">
              <dt>Tax</dt>
              <dd>{formatPrice(totals.tax)}</dd>
            </div>
            <div className="flex justify-between text-text-secondary">
              <dt>Delivery</dt>
              <dd>
                {totals.deliveryCharge === 0
                  ? 'Free'
                  : formatPrice(totals.deliveryCharge)}
              </dd>
            </div>
            <div className="flex justify-between border-t border-black/5 pt-2 text-base font-semibold text-text-primary">
              <dt>Total</dt>
              <dd className="text-primary">{formatPrice(totals.total)}</dd>
            </div>
          </dl>

          <p className="text-xs text-text-secondary">
            Payment: Pay later (UPI QR after ready / delivery)
          </p>

          <Button
            type="button"
            className="w-full"
            disabled={isSubmitting}
            onClick={() => void handleSubmit()}
          >
            {isSubmitting ? 'Placing order…' : 'Place phone order'}
          </Button>
        </section>
      </div>

      <section className="rounded-[var(--radius-card)] bg-surface p-5 shadow-md">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="font-semibold text-text-primary">Menu</h3>
          <div className="relative max-w-md flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary"
              aria-hidden="true"
            />
            <Input
              placeholder="Search dishes…"
              value={dishSearch}
              onChange={(event) => setDishSearch(event.target.value)}
              className="pl-10"
              aria-label="Search dishes"
            />
          </div>
        </div>

        <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {filteredDishes.map((dish) => (
            <li
              key={dish.id}
              className="flex items-center justify-between gap-3 rounded-[var(--radius-input)] border border-black/8 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-text-primary">
                  {dish.name}
                </p>
                <p className="text-xs text-text-secondary">
                  {dish.category_name} · {formatPrice(dish.price)}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => addDish(dish)}
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </Button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

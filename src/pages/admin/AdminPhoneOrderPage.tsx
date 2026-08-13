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
import { useGstSettings } from '@/hooks/useGstSettings'
import { useStoreOpenStatus } from '@/hooks/useStoreOpenStatus'
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
import { effectiveOrderTaxRate } from '@/utils/gstSettings'
import { calculateOrderTotals, defaultDeliveryCharge } from '@/utils/orderTotals'
import { formatPrice } from '@/utils/format'
import { cn } from '@/utils/cn'
import { isValidPhone } from '@/utils/validation'

interface DraftItem {
  key: string
  dishId: string
  name: string
  unitPrice: number
  quantity: number
}

interface CustomerFormSnapshot {
  phone: string
  customerName: string
  fulfillmentType: FulfillmentType
  branchId: string
  addressId: string
  guestLine1: string
  guestLine2: string
  guestLandmark: string
  guestCity: string
  guestState: string
  guestPincode: string
  matchedCustomerId: string | null
}

function snapshotKey(snapshot: CustomerFormSnapshot): string {
  return JSON.stringify(snapshot)
}

export default function AdminPhoneOrderPage() {
  const navigate = useNavigate()
  const { status: storeStatus, isLoading: isStoreStatusLoading } =
    useStoreOpenStatus()
  const { settings: gstSettings } = useGstSettings()
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
  const [isSavingCustomer, setIsSavingCustomer] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null)
  /** True after Look up for the current mobile — required before save/place. */
  const [phoneVerified, setPhoneVerified] = useState(false)

  const [guestLine1, setGuestLine1] = useState('')
  const [guestLine2, setGuestLine2] = useState('')
  const [guestLandmark, setGuestLandmark] = useState('')
  const [guestCity, setGuestCity] = useState('Bangalore')
  const [guestState, setGuestState] = useState('Karnataka')
  const [guestPincode, setGuestPincode] = useState('')

  const currentSnapshot = useMemo<CustomerFormSnapshot>(
    () => ({
      phone,
      customerName: customerName.trim(),
      fulfillmentType,
      branchId,
      addressId,
      guestLine1: guestLine1.trim(),
      guestLine2: guestLine2.trim(),
      guestLandmark: guestLandmark.trim(),
      guestCity: guestCity.trim(),
      guestState: guestState.trim(),
      guestPincode: guestPincode.trim(),
      matchedCustomerId: matchedCustomer?.id ?? null,
    }),
    [
      phone,
      customerName,
      fulfillmentType,
      branchId,
      addressId,
      guestLine1,
      guestLine2,
      guestLandmark,
      guestCity,
      guestState,
      guestPincode,
      matchedCustomer?.id,
    ],
  )

  const customerDirty =
    savedSnapshot === null || snapshotKey(currentSnapshot) !== savedSnapshot

  const hasSavedNumber =
    phoneVerified &&
    !customerDirty &&
    isValidPhone(phone) &&
    Boolean(customerName.trim())

  const clearCustomerDetails = (keepPhone = false) => {
    setMatchedCustomer(null)
    setCustomerName('')
    setAddresses([])
    setAddressId('')
    setGuestLine1('')
    setGuestLine2('')
    setGuestLandmark('')
    setGuestCity('Bangalore')
    setGuestState('Karnataka')
    setGuestPincode('')
    setNotes('')
    setSavedSnapshot(null)
    setPhoneVerified(false)
    if (!keepPhone) {
      // phone cleared by caller when needed
    }
  }

  const handlePhoneChange = (value: string) => {
    const next = value.replace(/\D/g, '').slice(0, 10)
    if (next !== phone) {
      clearCustomerDetails(true)
      setSavedSnapshot(null)
      setPhoneVerified(false)
    }
    setPhone(next)
  }

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

  const qtyByDishId = useMemo(() => {
    const map = new Map<string, number>()
    for (const item of items) {
      map.set(item.dishId, (map.get(item.dishId) ?? 0) + item.quantity)
    }
    return map
  }, [items])

  const subtotal = items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  )
  const deliveryCharge =
    fulfillmentType === 'pickup' ? 0 : defaultDeliveryCharge(subtotal)
  const totals = calculateOrderTotals(
    subtotal,
    0,
    deliveryCharge,
    effectiveOrderTaxRate(gstSettings.enabled),
  )

  const validateCustomerForm = (): string | null => {
    if (!isValidPhone(phone)) return 'Enter a valid 10-digit phone number.'
    if (!customerName.trim()) return 'Customer name is required.'
    if (fulfillmentType === 'delivery') {
      if (addressId) return null
      if (!guestLine1.trim()) return 'Address line 1 is required.'
      if (!/^\d{6}$/.test(guestPincode.trim())) {
        return 'Enter a valid 6-digit pincode.'
      }
      if (!guestCity.trim()) return 'City is required.'
      if (!guestState.trim()) return 'State is required.'
    }
    return null
  }

  const markSaved = (snapshot: CustomerFormSnapshot) => {
    setSavedSnapshot(snapshotKey(snapshot))
  }

  const handleLookup = async () => {
    if (!isValidPhone(phone)) {
      toast.error('Enter a valid 10-digit phone number.')
      return
    }

    setIsLookingUp(true)
    const result = await customerService.lookupCustomerForPhoneOrder(phone)
    setIsLookingUp(false)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    if (!result.data) {
      clearCustomerDetails(true)
      setSavedSnapshot(null)
      setPhoneVerified(true)
      toast.success('New number — enter details and tap Save.')
      return
    }

    const lookup = result.data
    setPhoneVerified(true)
    setMatchedCustomer(lookup.profile)
    setCustomerName(lookup.customerName)

    let nextAddressId = ''
    let nextAddresses = lookup.addresses
    if (nextAddresses.length > 0) {
      const preferred =
        nextAddresses.find((address) => address.is_default) ??
        nextAddresses[0]
      nextAddressId = preferred?.id ?? ''
    }
    setAddresses(nextAddresses)
    setAddressId(nextAddressId)

    if (lookup.guestAddress && !nextAddressId) {
      setGuestLine1(lookup.guestAddress.line1)
      setGuestLine2(lookup.guestAddress.line2)
      setGuestLandmark(lookup.guestAddress.landmark)
      setGuestCity(lookup.guestAddress.city)
      setGuestState(lookup.guestAddress.state)
      setGuestPincode(lookup.guestAddress.pincode)
    } else {
      setGuestLine1('')
      setGuestLine2('')
      setGuestLandmark('')
      setGuestCity('Bangalore')
      setGuestState('Karnataka')
      setGuestPincode('')
    }

    const loaded: CustomerFormSnapshot = {
      phone,
      customerName: lookup.customerName.trim(),
      fulfillmentType,
      branchId,
      addressId: nextAddressId,
      guestLine1: nextAddressId ? '' : lookup.guestAddress?.line1.trim() ?? '',
      guestLine2: nextAddressId ? '' : lookup.guestAddress?.line2.trim() ?? '',
      guestLandmark: nextAddressId
        ? ''
        : lookup.guestAddress?.landmark.trim() ?? '',
      guestCity: nextAddressId
        ? 'Bangalore'
        : lookup.guestAddress?.city.trim() ?? 'Bangalore',
      guestState: nextAddressId
        ? 'Karnataka'
        : lookup.guestAddress?.state.trim() ?? 'Karnataka',
      guestPincode: nextAddressId ? '' : lookup.guestAddress?.pincode.trim() ?? '',
      matchedCustomerId: lookup.profile?.id ?? null,
    }
    markSaved(loaded)

    if (lookup.source === 'profile' || lookup.source === 'address') {
      toast.success(`Matched ${lookup.customerName} — ready to order`)
      return
    }

    toast.success(`Found ${lookup.customerName} from a previous order — ready to order`)
  }

  const handleSaveCustomer = async () => {
    if (!phoneVerified) {
      toast.error('Look up the mobile number before saving.')
      return
    }

    const validationError = validateCustomerForm()
    if (validationError) {
      toast.error(validationError)
      return
    }

    setIsSavingCustomer(true)

    if (matchedCustomer) {
      if (customerName.trim() !== matchedCustomer.full_name) {
        const updateResult = await customerService.updateCustomerName(
          matchedCustomer.id,
          customerName,
        )
        if (!updateResult.success) {
          setIsSavingCustomer(false)
          toast.error(updateResult.message)
          return
        }
        setMatchedCustomer(updateResult.data)
      }

      if (fulfillmentType === 'delivery' && !addressId) {
        const addressResult = await customerService.addAddressForCustomer(
          matchedCustomer.id,
          {
            fullName: customerName,
            phone,
            addressLine1: guestLine1,
            addressLine2: guestLine2,
            landmark: guestLandmark,
            city: guestCity,
            state: guestState,
            pincode: guestPincode,
          },
        )
        if (!addressResult.success) {
          setIsSavingCustomer(false)
          toast.error(addressResult.message)
          return
        }

        const refreshed = await customerService.getCustomerAddresses(
          matchedCustomer.id,
        )
        if (refreshed.success) {
          setAddresses(refreshed.data)
        }
        setAddressId(addressResult.data.id)
        setGuestLine1('')
        setGuestLine2('')
        setGuestLandmark('')
        setGuestPincode('')

        const saved: CustomerFormSnapshot = {
          ...currentSnapshot,
          customerName: customerName.trim(),
          addressId: addressResult.data.id,
          guestLine1: '',
          guestLine2: '',
          guestLandmark: '',
          guestPincode: '',
          matchedCustomerId: matchedCustomer.id,
        }
        markSaved(saved)
        setIsSavingCustomer(false)
        toast.success('Customer details saved')
        return
      }
    }

    markSaved(currentSnapshot)
    setIsSavingCustomer(false)
    toast.success(
      matchedCustomer
        ? 'Customer details saved'
        : 'Customer details saved — you can place the order',
    )
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

  const updateQtyByDish = (dishId: string, delta: number) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.dishId === dishId)
      if (!existing) return prev
      return prev
        .map((item) =>
          item.dishId === dishId
            ? { ...item, quantity: item.quantity + delta }
            : item,
        )
        .filter((item) => item.quantity > 0)
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
    if (!phoneVerified || !isValidPhone(phone)) {
      toast.error(
        'Look up and save a valid mobile number before placing the order.',
      )
      return
    }

    if (customerDirty || !hasSavedNumber) {
      toast.error(
        'Save customer details for this mobile number before placing the order.',
      )
      return
    }

    const validationError = validateCustomerForm()
    if (validationError) {
      toast.error(validationError)
      return
    }
    if (items.length === 0) {
      toast.error('Add at least one dish.')
      return
    }
    if (!isStoreStatusLoading && storeStatus && !storeStatus.isOpen) {
      toast.error(
        `${storeStatus.reason} Update Store timings in Settings to accept orders now.`,
      )
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
      toast.error(
        result.error ? `${result.message} (${result.error})` : result.message,
      )
      return
    }

    toast.success(
      `Phone / counter order ${result.data.order_number} placed — now on the kitchen board`,
    )
    navigate(ROUTES.ADMIN.ORDERS)
  }

  if (isLoadingMenu) {
    return <LoadingState />
  }

  const needsGuestAddress = fulfillmentType === 'delivery' && !addressId

  return (
    <div className="space-y-2">
      <section className="rounded-[var(--radius-card)] bg-surface p-2.5 shadow-md sm:p-3">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <h3 className="text-sm font-semibold text-text-primary">
              Customer
            </h3>
            {customerDirty ? (
              <span className="text-[11px] font-medium text-error">
                Unsaved
              </span>
            ) : (
              <span className="text-[11px] font-medium text-success">
                Saved
              </span>
            )}
            {matchedCustomer ? (
              <span className="truncate text-[11px] text-text-secondary">
                Linked · {matchedCustomer.full_name}
              </span>
            ) : null}
          </div>
          <Button
            type="button"
            variant={customerDirty ? 'primary' : 'secondary'}
            size="sm"
            className="h-8 shrink-0 px-3"
            disabled={
              isSavingCustomer || !customerDirty || !phoneVerified
            }
            onClick={() => void handleSaveCustomer()}
          >
            {isSavingCustomer
              ? 'Saving…'
              : !phoneVerified
                ? 'Look up first'
                : customerDirty
                  ? 'Save'
                  : 'Saved'}
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-1.5 lg:grid-cols-6">
            <div className="col-span-2 lg:col-span-2">
              <div className="flex gap-1.5">
                <Input
                  compact
                  label="Mobile *"
                  inputMode="numeric"
                  maxLength={10}
                  value={phone}
                  onChange={(event) => handlePhoneChange(event.target.value)}
                  placeholder="10-digit"
                />
                <div className="flex shrink-0 items-end">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-9 px-2.5"
                    onClick={() => void handleLookup()}
                    disabled={isLookingUp}
                  >
                    {isLookingUp ? '…' : 'Look up'}
                  </Button>
                </div>
              </div>
            </div>

            <div className="col-span-2 lg:col-span-2">
              <Input
                compact
                label="Name *"
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                placeholder="Customer name"
              />
            </div>

            <Select
              compact
              label="Type"
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
              compact
              label="Branch"
              value={branchId}
              onChange={(event) => setBranchId(event.target.value)}
              options={[
                { label: 'Select', value: '' },
                ...branches.map((branch) => ({
                  label: branch.name,
                  value: branch.id,
                })),
              ]}
            />

            {fulfillmentType === 'delivery' && addresses.length > 0 ? (
              <div className="col-span-2 lg:col-span-6">
                <Select
                  compact
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
              </div>
            ) : null}

            {needsGuestAddress ? (
              <>
                <div className="col-span-2 lg:col-span-4">
                  <Input
                    compact
                    label="Address line 1 *"
                    value={guestLine1}
                    onChange={(event) => setGuestLine1(event.target.value)}
                    placeholder="House / street"
                  />
                </div>
                <div className="col-span-2 lg:col-span-2">
                  <Input
                    compact
                    label="Pincode *"
                    value={guestPincode}
                    onChange={(event) =>
                      setGuestPincode(
                        event.target.value.replace(/\D/g, '').slice(0, 6),
                      )
                    }
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="560001"
                  />
                </div>
                <div className="col-span-2 lg:col-span-3">
                  <Input
                    compact
                    label="Address line 2"
                    value={guestLine2}
                    onChange={(event) => setGuestLine2(event.target.value)}
                    placeholder="Area / locality"
                  />
                </div>
                <div className="col-span-2 lg:col-span-3">
                  <Input
                    compact
                    label="Landmark"
                    value={guestLandmark}
                    onChange={(event) => setGuestLandmark(event.target.value)}
                    placeholder="Near…"
                  />
                </div>
                <div className="col-span-1 lg:col-span-2">
                  <Input
                    compact
                    label="City"
                    value={guestCity}
                    onChange={(event) => setGuestCity(event.target.value)}
                  />
                </div>
                <div className="col-span-1 lg:col-span-2">
                  <Input
                    compact
                    label="State"
                    value={guestState}
                    onChange={(event) => setGuestState(event.target.value)}
                  />
                </div>
                <div className="col-span-2 lg:col-span-2">
                  <Textarea
                    compact
                    label="Notes"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    rows={1}
                    placeholder="Spice / call on arrival…"
                  />
                </div>
              </>
            ) : (
              <div className="col-span-2 lg:col-span-6">
                <Textarea
                  compact
                  label="Notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={1}
                  placeholder="Spice level, call on arrival…"
                />
              </div>
            )}
          </div>
      </section>

      <div className="grid gap-2 xl:grid-cols-[1.35fr_0.65fr]">
        <section className="rounded-[var(--radius-card)] bg-surface p-2.5 shadow-md sm:p-3">
          <div className="mb-2 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-sm font-semibold text-text-primary">Menu</h3>
            <div className="relative max-w-md flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-secondary"
                aria-hidden="true"
              />
              <Input
                compact
                placeholder="Search dishes…"
                value={dishSearch}
                onChange={(event) => setDishSearch(event.target.value)}
                className="pl-9"
                aria-label="Search dishes"
              />
            </div>
          </div>

          <ul className="grid max-h-[min(52vh,520px)] gap-1 overflow-y-auto sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
            {filteredDishes.map((dish) => {
              const qty = qtyByDishId.get(dish.id) ?? 0
              const inCart = qty > 0

              return (
                <li
                  key={dish.id}
                  className={cn(
                    'flex items-center justify-between gap-2 rounded-[var(--radius-input)] border px-2 py-1.5',
                    inCart ? 'border-primary/40 bg-primary/5' : 'border-black/8',
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-primary">
                      {dish.name}
                    </p>
                    <p className="text-[11px] text-text-secondary">
                      {dish.category_name} · {formatPrice(dish.price)}
                    </p>
                  </div>

                  {inCart ? (
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-white"
                        onClick={() => updateQtyByDish(dish.id, -1)}
                        aria-label={`Decrease ${dish.name}`}
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="min-w-6 text-center text-sm font-bold text-primary">
                        {qty}
                      </span>
                      <button
                        type="button"
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-white"
                        onClick={() => updateQtyByDish(dish.id, 1)}
                        aria-label={`Increase ${dish.name}`}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="h-8 px-2.5"
                      onClick={() => addDish(dish)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        </section>

        <section className="flex flex-col gap-2 rounded-[var(--radius-card)] bg-surface p-2.5 shadow-md sm:p-3 xl:sticky xl:top-3 xl:self-start">
          <h3 className="text-sm font-semibold text-text-primary">
            Order summary
          </h3>
          {items.length === 0 ? (
            <p className="text-xs text-text-secondary">
              Add dishes from the menu.
            </p>
          ) : (
            <ul className="max-h-48 divide-y divide-black/5 overflow-y-auto">
              {items.map((item) => (
                <li
                  key={item.key}
                  className="flex items-center justify-between gap-2 py-1.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-primary">
                      {item.name}
                    </p>
                    <p className="text-[11px] text-text-secondary">
                      {formatPrice(item.unitPrice)} each
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="rounded-full border border-black/10 p-0.5"
                      onClick={() => updateQty(item.key, -1)}
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-5 text-center text-sm font-semibold">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      className="rounded-full border border-black/10 p-0.5"
                      onClick={() => updateQty(item.key, 1)}
                      aria-label="Increase quantity"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      className="rounded-full p-0.5 text-error"
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

          <dl className="mt-auto space-y-0.5 text-xs">
            <div className="flex justify-between text-text-secondary">
              <dt>Subtotal</dt>
              <dd>{formatPrice(totals.subtotal)}</dd>
            </div>
            {totals.tax > 0 && (
              <div className="flex justify-between text-text-secondary">
                <dt>GST</dt>
                <dd>{formatPrice(totals.tax)}</dd>
              </div>
            )}
            <div className="flex justify-between text-text-secondary">
              <dt>Delivery</dt>
              <dd>
                {totals.deliveryCharge === 0
                  ? 'Free'
                  : formatPrice(totals.deliveryCharge)}
              </dd>
            </div>
            <div className="flex justify-between border-t border-black/5 pt-1.5 text-sm font-semibold text-text-primary">
              <dt>Total</dt>
              <dd className="text-primary">{formatPrice(totals.total)}</dd>
            </div>
          </dl>

          <p className="text-[11px] text-text-secondary">
            Pay later (UPI QR after ready / delivery)
          </p>

          {!phoneVerified ? (
            <p className="rounded-[var(--radius-button)] bg-primary/10 px-2 py-1 text-[11px] text-text-primary">
              Look up a mobile number, then save details before placing the
              order.
            </p>
          ) : !hasSavedNumber ? (
            <p className="rounded-[var(--radius-button)] bg-primary/10 px-2 py-1 text-[11px] text-text-primary">
              Save customer details for this mobile number before placing the
              order.
            </p>
          ) : null}

          {!isStoreStatusLoading && storeStatus && !storeStatus.isOpen && (
            <p className="rounded-[var(--radius-button)] bg-error/10 px-2 py-1 text-[11px] text-error">
              {storeStatus.reason}
            </p>
          )}

          <Button
            type="button"
            size="sm"
            className="w-full"
            disabled={
              isSubmitting ||
              !hasSavedNumber ||
              isStoreStatusLoading ||
              Boolean(storeStatus && !storeStatus.isOpen)
            }
            onClick={() => void handleSubmit()}
          >
            {isSubmitting
              ? 'Placing order…'
              : storeStatus && !storeStatus.isOpen
                ? 'Store closed'
                : !phoneVerified
                  ? 'Look up mobile first'
                  : !hasSavedNumber
                    ? 'Save number first'
                    : 'Place order'}
          </Button>
        </section>
      </div>
    </div>
  )
}

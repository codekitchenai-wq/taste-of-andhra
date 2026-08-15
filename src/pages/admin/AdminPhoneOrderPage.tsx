import { useEffect, useMemo, useState } from 'react'
import { Copy, ExternalLink, Minus, Plus, Search, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingState } from '@/components/ui/LoadingState'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { ORDER_TAX_RATE } from '@/constants/ORDER'
import { ROUTES } from '@/constants/ROUTES'
import { usePhoneOrderDeliveryQuote } from '@/hooks/usePhoneOrderDeliveryQuote'
import { useStoreOpenStatus } from '@/hooks/useStoreOpenStatus'
import * as branchService from '@/services/branchService'
import * as customerService from '@/services/customerService'
import * as dishService from '@/services/dishService'
import * as gstInvoiceService from '@/services/gstInvoiceService'
import * as offerService from '@/services/offerService'
import * as orderService from '@/services/orderService'
import * as paymentShareService from '@/services/paymentShareService'
import * as printerService from '@/services/printerService'
import type { Address } from '@/types/Address'
import type { Branch } from '@/types/Branch'
import type { FulfillmentType } from '@/types/enums'
import type { Offer } from '@/types/Offer'
import type { Profile } from '@/types/Profile'
import type { DishWithCategory } from '@/utils/mapDish'
import { formatAddressLine } from '@/utils/mapAddress'
import { calculateOrderTotals } from '@/utils/orderTotals'
import { formatPrice } from '@/utils/format'
import { cn } from '@/utils/cn'
import { isValidPhone } from '@/utils/validation'

type PaymentCollection = 'counter' | 'delivery' | 'link'

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
    useState<FulfillmentType>('pickup')
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
  /** Null = use quoted amount; otherwise staff override. */
  const [deliveryChargeOverride, setDeliveryChargeOverride] = useState<
    number | null
  >(null)
  const [deliveryChargeInput, setDeliveryChargeInput] = useState('')
  const [appliedOffer, setAppliedOffer] = useState<Offer | null>(null)
  const [couponDiscount, setCouponDiscount] = useState(0)
  const [couponCode, setCouponCode] = useState('')
  const [couponDraft, setCouponDraft] = useState('')
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false)
  const [paymentCollection, setPaymentCollection] =
    useState<PaymentCollection>('counter')
  const [shareModal, setShareModal] = useState<{
    orderNumber: string
    pageUrl: string
    message: string
    phone: string
  } | null>(null)

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

  /** Customer mobile + details must be saved before menu / place order. */
  const canEnterOrder =
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
    setItems([])
    setSavedSnapshot(null)
    setPhoneVerified(false)
    setDeliveryChargeOverride(null)
    setDeliveryChargeInput('')
    setAppliedOffer(null)
    setCouponDiscount(0)
    setCouponCode('')
    setCouponDraft('')
    setPaymentCollection('counter')
    setShareModal(null)
    if (!keepPhone) {
      // phone cleared by caller when needed
    }
  }

  const handlePhoneChange = (value: string) => {
    const next = value.replace(/\D/g, '').slice(0, 10)
    if (next !== phone) {
      clearCustomerDetails(true)
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
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)

  const selectedBranch = useMemo(
    () => branches.find((branch) => branch.id === branchId) ?? null,
    [branches, branchId],
  )

  const selectedAddress = useMemo(
    () => addresses.find((address) => address.id === addressId) ?? null,
    [addresses, addressId],
  )

  const savedGuestAddress = useMemo(() => {
    if (fulfillmentType !== 'delivery' || addressId) return null
    if (!canEnterOrder) return null
    if (!guestLine1.trim() || !/^\d{6}$/.test(guestPincode.trim())) return null
    return {
      line1: guestLine1.trim(),
      line2: guestLine2.trim(),
      landmark: guestLandmark.trim(),
      city: guestCity.trim(),
      state: guestState.trim(),
      pincode: guestPincode.trim(),
    }
  }, [
    fulfillmentType,
    addressId,
    canEnterOrder,
    guestLine1,
    guestLine2,
    guestLandmark,
    guestCity,
    guestState,
    guestPincode,
  ])

  const { quote: deliveryQuote, isLoading: isQuoteLoading } =
    usePhoneOrderDeliveryQuote({
      enabled: canEnterOrder && fulfillmentType === 'delivery',
      fulfillmentType,
      savedAddress:
        canEnterOrder && fulfillmentType === 'delivery' ? selectedAddress : null,
      guestAddress: savedGuestAddress,
      branch: selectedBranch,
      subtotal,
      itemCount,
    })

  useEffect(() => {
    setDeliveryChargeOverride(null)
    setDeliveryChargeInput('')
  }, [fulfillmentType, addressId, savedGuestAddress?.pincode, branchId])

  useEffect(() => {
    setPaymentCollection(fulfillmentType === 'pickup' ? 'counter' : 'delivery')
  }, [fulfillmentType])

  useEffect(() => {
    if (deliveryChargeOverride !== null) {
      setDeliveryChargeInput(String(deliveryChargeOverride))
      return
    }
    if (deliveryQuote?.isServiceable) {
      setDeliveryChargeInput(String(deliveryQuote.amount))
      return
    }
    if (fulfillmentType === 'pickup') {
      setDeliveryChargeInput('0')
    }
  }, [deliveryChargeOverride, deliveryQuote, fulfillmentType])

  const quotedDeliveryAmount =
    fulfillmentType === 'pickup'
      ? 0
      : deliveryQuote?.isServiceable
        ? deliveryQuote.amount
        : 0

  const deliveryCharge =
    fulfillmentType === 'pickup'
      ? 0
      : (deliveryChargeOverride ?? quotedDeliveryAmount)

  const totals = calculateOrderTotals(
    subtotal,
    couponDiscount,
    deliveryCharge,
    ORDER_TAX_RATE,
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
      setPhoneVerified(true)
      toast.success('New number — enter details and tap Save before ordering.')
      return
    }

    const lookup = result.data
    setItems([])
    setSavedSnapshot(null)
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

    if (lookup.source === 'profile' || lookup.source === 'address') {
      toast.success(
        `Matched ${lookup.customerName} — review details and tap Save.`,
      )
      return
    }

    toast.success(
      `Found ${lookup.customerName} from a previous order — review and tap Save.`,
    )
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
    toast.success('Customer details saved — you can enter the order')
  }

  const addDish = (dish: DishWithCategory) => {
    if (!canEnterOrder) {
      toast.error('Save customer details before adding dishes.')
      return
    }
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
    if (!canEnterOrder) {
      toast.error('Save customer details before editing the order.')
      return
    }
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
    if (!canEnterOrder) {
      toast.error('Save customer details before editing the order.')
      return
    }
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

  const applyDeliveryChargeInput = () => {
    const parsed = Number(deliveryChargeInput)
    if (!Number.isFinite(parsed) || parsed < 0) {
      toast.error('Enter a valid delivery charge (0 or more).')
      return
    }
    const rounded = Math.round(parsed * 100) / 100
    setDeliveryChargeOverride(rounded)
    setDeliveryChargeInput(String(rounded))
    toast.success('Delivery charge updated')
  }

  const resetDeliveryChargeToQuote = () => {
    setDeliveryChargeOverride(null)
    if (deliveryQuote?.isServiceable) {
      setDeliveryChargeInput(String(deliveryQuote.amount))
    }
  }

  const handleApplyCoupon = async () => {
    const code = couponDraft.trim()
    if (!code) return
    if (subtotal <= 0) {
      toast.error('Add dishes before applying a coupon.')
      return
    }

    setIsApplyingCoupon(true)
    const result = await offerService.validateCoupon(code, subtotal)
    setIsApplyingCoupon(false)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    setAppliedOffer(result.data.offer)
    setCouponDiscount(result.data.discountAmount)
    setCouponCode(result.data.offer.coupon_code?.trim() ?? code)
    setCouponDraft('')
    toast.success(`Coupon applied: ${result.data.offer.title}`)
  }

  const handleRemoveCoupon = () => {
    setAppliedOffer(null)
    setCouponDiscount(0)
    setCouponCode('')
  }

  useEffect(() => {
    if (!appliedOffer || !couponCode) return
    if (subtotal >= appliedOffer.minimum_order) {
      const next =
        Math.round(subtotal * (appliedOffer.discount_percentage / 100) * 100) /
        100
      setCouponDiscount(next)
      return
    }
    setAppliedOffer(null)
    setCouponDiscount(0)
    setCouponCode('')
    toast.error('Coupon removed — order no longer meets the minimum.')
  }, [subtotal, appliedOffer, couponCode])

  const generateCounterBill = async (orderId: string) => {
    const details = await orderService.getAdminOrderDetails(orderId)
    if (!details.success) return

    const invoiceResult = await gstInvoiceService.ensureInvoiceForOrder(
      details.data,
    )
    if (invoiceResult.success) {
      toast.success(`Bill ${invoiceResult.data.invoice_number} generated`)
    } else if (!invoiceResult.message.toLowerCase().includes('disabled')) {
      toast.error(invoiceResult.message)
    }

    const settingsResult = await printerService.getPrinterSettings()
    if (!settingsResult.success) return
    const settings = settingsResult.data
    if (!settings.billing.enabled) return

    const printResult = await printerService.printTicket(
      details.data,
      'billing',
      settings,
      { forceBrowser: settings.mode === 'browser' },
    )
    if (printResult.success) {
      toast.success('Bill sent to printer')
    }
  }

  const openShareForOrder = async (
    order: orderService.CreatePhoneOrderResult,
  ) => {
    const token = order.payment_share_token
    if (!token) {
      toast.error(
        'Payment link is unavailable until the database migration is applied.',
      )
      navigate(ROUTES.ADMIN.ORDERS)
      return
    }

    const pageUrl = paymentShareService.paymentShareAbsoluteUrl(token)
    const shareView = await paymentShareService.getPaymentShareByToken(token)
    const message = shareView.success
      ? paymentShareService.buildPaymentShareMessage(shareView.data, pageUrl)
      : `${customerName ? `Hi ${customerName.trim()},` : 'Hi,'}\nOrder ${order.order_number}\nTotal: ${formatPrice(order.total)}\nPay here: ${pageUrl}`

    setShareModal({
      orderNumber: order.order_number,
      pageUrl,
      message,
      phone: phone.trim(),
    })
  }

  const handleSubmit = async () => {
    if (!phoneVerified || !isValidPhone(phone)) {
      toast.error(
        'Look up and save a valid mobile number before placing the order.',
      )
      return
    }

    if (customerDirty || !canEnterOrder) {
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
      couponCode: couponCode || undefined,
      paymentCollection,
    })
    setIsSubmitting(false)

    if (!result.success) {
      toast.error(
        result.error ? `${result.message} (${result.error})` : result.message,
      )
      return
    }

    if (fulfillmentType === 'pickup' || paymentCollection === 'counter') {
      await generateCounterBill(result.data.id)
    }

    toast.success(
      `Phone order ${result.data.order_number} placed — on the kitchen board`,
    )

    if (
      paymentCollection === 'link' ||
      paymentCollection === 'delivery' ||
      paymentCollection === 'counter'
    ) {
      await openShareForOrder(result.data)
      return
    }

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
                Unsaved — save before ordering
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

            <div className="col-span-2 lg:col-span-1">
              <p className="mb-1 text-[11px] font-medium text-text-secondary">
                Fulfillment
              </p>
              <div
                className="flex h-9 overflow-hidden rounded-[var(--radius-input)] border border-black/10"
                role="radiogroup"
                aria-label="Fulfillment type"
              >
                {(
                  [
                    { value: 'pickup', label: 'Pickup' },
                    { value: 'delivery', label: 'Delivery' },
                  ] as const
                ).map((option) => {
                  const selected = fulfillmentType === option.value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setFulfillmentType(option.value)}
                      className={cn(
                        'flex-1 px-2 text-xs font-semibold transition-colors',
                        selected
                          ? 'bg-primary text-white'
                          : 'bg-surface text-text-secondary hover:bg-primary/5',
                      )}
                    >
                      {option.label}
                    </button>
                  )
                })}
              </div>
            </div>

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
                disabled={!canEnterOrder}
              />
            </div>
          </div>

          {!canEnterOrder ? (
            <p className="mb-2 rounded-[var(--radius-button)] bg-primary/10 px-2 py-1.5 text-[11px] text-text-primary">
              {!phoneVerified
                ? 'Look up the mobile number, then tap Save before adding dishes.'
                : 'Save customer details (name, pickup/delivery, address) before adding dishes.'}
            </p>
          ) : null}

          <ul
            className={cn(
              'grid max-h-[min(52vh,520px)] gap-1 overflow-y-auto sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3',
              !canEnterOrder && 'pointer-events-none opacity-50',
            )}
          >
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
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-white disabled:opacity-40"
                        onClick={() => updateQtyByDish(dish.id, -1)}
                        aria-label={`Decrease ${dish.name}`}
                        disabled={!canEnterOrder}
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="min-w-6 text-center text-sm font-bold text-primary">
                        {qty}
                      </span>
                      <button
                        type="button"
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-white disabled:opacity-40"
                        onClick={() => updateQtyByDish(dish.id, 1)}
                        aria-label={`Increase ${dish.name}`}
                        disabled={!canEnterOrder}
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
                      disabled={!canEnterOrder}
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
              {canEnterOrder
                ? 'Add dishes from the menu.'
                : 'Save customer details first, then add dishes.'}
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
                      className="rounded-full border border-black/10 p-0.5 disabled:opacity-40"
                      onClick={() => updateQty(item.key, -1)}
                      aria-label="Decrease quantity"
                      disabled={!canEnterOrder}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-5 text-center text-sm font-semibold">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      className="rounded-full border border-black/10 p-0.5 disabled:opacity-40"
                      onClick={() => updateQty(item.key, 1)}
                      aria-label="Increase quantity"
                      disabled={!canEnterOrder}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      className="rounded-full p-0.5 text-error disabled:opacity-40"
                      onClick={() =>
                        setItems((prev) =>
                          prev.filter((row) => row.key !== item.key),
                        )
                      }
                      aria-label="Remove item"
                      disabled={!canEnterOrder}
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
            <div className="flex justify-between text-text-secondary">
              <dt>GST ({(ORDER_TAX_RATE * 100).toFixed(0)}%)</dt>
              <dd>{formatPrice(totals.tax)}</dd>
            </div>
            {totals.discount > 0 && (
              <div className="flex justify-between text-success">
                <dt>Coupon{couponCode ? ` (${couponCode})` : ''}</dt>
                <dd>-{formatPrice(totals.discount)}</dd>
              </div>
            )}
            <div className="flex justify-between text-text-secondary">
              <dt>{fulfillmentType === 'pickup' ? 'Pickup' : 'Delivery'}</dt>
              <dd>
                {fulfillmentType === 'pickup'
                  ? '—'
                  : isQuoteLoading
                    ? 'Calculating…'
                    : totals.deliveryCharge === 0
                      ? 'Free'
                      : formatPrice(totals.deliveryCharge)}
              </dd>
            </div>
            <div className="flex justify-between border-t border-black/5 pt-1.5 text-sm font-semibold text-text-primary">
              <dt>Total</dt>
              <dd className="text-primary">{formatPrice(totals.total)}</dd>
            </div>
          </dl>

          {fulfillmentType === 'delivery' && canEnterOrder ? (
            <div className="space-y-1.5 rounded-[var(--radius-button)] border border-black/8 bg-background/60 p-2">
              <p className="text-[11px] font-medium text-text-primary">
                Delivery charge
              </p>
              {isQuoteLoading ? (
                <p className="text-[11px] text-text-secondary">
                  Calculating from distance…
                </p>
              ) : (
                <p className="text-[11px] text-text-secondary">
                  {deliveryQuote?.distanceKm != null
                    ? `${deliveryQuote.distanceKm.toFixed(1)} km from kitchen`
                    : 'Distance unavailable — using base rate'}
                  {deliveryQuote?.isServiceable
                    ? ` · quoted ${formatPrice(deliveryQuote.amount)}`
                    : ''}
                  {deliveryChargeOverride !== null ? ' · overridden' : ''}
                </p>
              )}
              {deliveryQuote?.isServiceable === false ? (
                <p className="text-[11px] text-error">
                  {deliveryQuote.unserviceableReason ??
                    'Outside delivery area — set a charge to continue.'}
                </p>
              ) : null}
              <div className="flex gap-1.5">
                <Input
                  compact
                  inputMode="decimal"
                  value={deliveryChargeInput}
                  onChange={(event) =>
                    setDeliveryChargeInput(
                      event.target.value.replace(/[^\d.]/g, ''),
                    )
                  }
                  aria-label="Delivery charge"
                  className="min-w-0"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="h-9 shrink-0 px-2.5"
                  onClick={applyDeliveryChargeInput}
                >
                  Apply
                </Button>
              </div>
              {deliveryChargeOverride !== null ? (
                <button
                  type="button"
                  className="text-[11px] font-medium text-primary"
                  onClick={resetDeliveryChargeToQuote}
                >
                  Reset to quoted amount
                </button>
              ) : null}
            </div>
          ) : null}

          {canEnterOrder ? (
            <div className="space-y-1.5 rounded-[var(--radius-button)] border border-black/8 bg-background/60 p-2">
              <p className="text-[11px] font-medium text-text-primary">
                Coupon
              </p>
              {appliedOffer ? (
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-text-primary">
                      {appliedOffer.coupon_code}
                    </p>
                    <p className="text-[11px] text-text-secondary">
                      {appliedOffer.discount_percentage}% off · saves{' '}
                      {formatPrice(couponDiscount)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="h-7 shrink-0 px-2"
                    onClick={handleRemoveCoupon}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="flex gap-1.5">
                  <Input
                    compact
                    placeholder="Code"
                    value={couponDraft}
                    onChange={(event) =>
                      setCouponDraft(event.target.value.toUpperCase())
                    }
                    aria-label="Coupon code"
                    className="min-w-0"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="h-9 shrink-0 px-2.5"
                    disabled={!couponDraft.trim() || isApplyingCoupon}
                    onClick={() => void handleApplyCoupon()}
                  >
                    {isApplyingCoupon ? '…' : 'Apply'}
                  </Button>
                </div>
              )}
            </div>
          ) : null}

          {canEnterOrder ? (
            <div className="space-y-1.5 rounded-[var(--radius-button)] border border-black/8 bg-background/60 p-2">
              <p className="text-[11px] font-medium text-text-primary">
                When will they pay?
              </p>
              <div
                className="grid grid-cols-1 gap-1.5"
                role="radiogroup"
                aria-label="Payment collection"
              >
                {(
                  [
                    {
                      value: 'link' as const,
                      label: 'Share payment link',
                      hint: 'WhatsApp / copy link with order details + UPI QR',
                    },
                    {
                      value: 'counter' as const,
                      label: 'Pay at counter',
                      hint: 'Cash / UPI when they pick up',
                    },
                    {
                      value: 'delivery' as const,
                      label: 'Pay on delivery',
                      hint: 'Collect with rider or doorstep UPI',
                    },
                  ] as const
                ).map((option) => {
                  const selected = paymentCollection === option.value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setPaymentCollection(option.value)}
                      className={cn(
                        'rounded-[var(--radius-button)] border px-2 py-1.5 text-left transition-colors',
                        selected
                          ? 'border-primary bg-primary/5'
                          : 'border-black/10 hover:border-primary/30',
                      )}
                    >
                      <span className="block text-xs font-semibold text-text-primary">
                        {option.label}
                      </span>
                      <span className="block text-[10px] text-text-secondary">
                        {option.hint}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}

          <p className="text-[11px] text-text-secondary">
            After placing, you can share a payment page with items, GST, and UPI
            QR.
          </p>

          {!phoneVerified ? (
            <p className="rounded-[var(--radius-button)] bg-primary/10 px-2 py-1 text-[11px] text-text-primary">
              Look up a mobile number, then tap Save before entering the order.
            </p>
          ) : !canEnterOrder ? (
            <p className="rounded-[var(--radius-button)] bg-primary/10 px-2 py-1 text-[11px] text-text-primary">
              Unsaved changes — tap Save before entering or placing the order.
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
              !canEnterOrder ||
              isStoreStatusLoading ||
              Boolean(storeStatus && !storeStatus.isOpen) ||
              (fulfillmentType === 'delivery' && isQuoteLoading)
            }
            onClick={() => void handleSubmit()}
          >
            {isSubmitting
              ? 'Placing order…'
              : storeStatus && !storeStatus.isOpen
                ? 'Store closed'
                : !phoneVerified
                  ? 'Look up mobile first'
                  : !canEnterOrder
                    ? 'Save details first'
                    : fulfillmentType === 'delivery' && isQuoteLoading
                      ? 'Calculating delivery…'
                      : paymentCollection === 'link'
                        ? 'Place order & share link'
                        : 'Place order'}
          </Button>
        </section>
      </div>

      <Modal
        isOpen={Boolean(shareModal)}
        onClose={() => {
          setShareModal(null)
          navigate(ROUTES.ADMIN.ORDERS)
        }}
        title="Share payment link"
        className="max-w-lg"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShareModal(null)
                navigate(ROUTES.ADMIN.ORDERS)
              }}
            >
              Done — kitchen board
            </Button>
          </div>
        }
      >
        {shareModal ? (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              Order <span className="font-semibold text-text-primary">{shareModal.orderNumber}</span>
              {' — '}customer opens this page to see items, GST, total, and UPI
              QR.
            </p>
            <div className="rounded-[var(--radius-input)] border border-black/10 bg-background px-3 py-2">
              <p className="break-all text-xs text-text-primary">
                {shareModal.pageUrl}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(shareModal.pageUrl)
                    toast.success('Payment link copied')
                  } catch {
                    toast.error('Unable to copy link')
                  }
                }}
              >
                <Copy className="h-3.5 w-3.5" />
                Copy link
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(shareModal.message)
                    toast.success('Message with order details copied')
                  } catch {
                    toast.error('Unable to copy message')
                  }
                }}
              >
                <Copy className="h-3.5 w-3.5" />
                Copy message
              </Button>
              <a
                href={paymentShareService.whatsappShareUrl(
                  shareModal.phone,
                  shareModal.message,
                )}
                target="_blank"
                rel="noreferrer"
                className="inline-flex"
              >
                <Button type="button" size="sm">
                  <ExternalLink className="h-3.5 w-3.5" />
                  WhatsApp
                </Button>
              </a>
              <a
                href={shareModal.pageUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex"
              >
                <Button type="button" size="sm" variant="secondary">
                  Open page
                </Button>
              </a>
            </div>
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-[var(--radius-input)] bg-background p-3 text-[11px] text-text-secondary">
              {shareModal.message}
            </pre>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}

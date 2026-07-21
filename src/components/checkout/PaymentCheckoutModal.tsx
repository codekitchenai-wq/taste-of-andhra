import { useEffect, useState } from 'react'
import {
  Building2,
  CreditCard,
  Smartphone,
  Wallet,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import {
  ONLINE_PAYMENT_CHANNELS,
  type OnlinePaymentChannel,
} from '@/constants/PAYMENT_METHOD'
import { formatPrice } from '@/utils/format'
import { cn } from '@/utils/cn'

interface PaymentCheckoutModalProps {
  isOpen: boolean
  amount: number
  orderNumber: string
  isProcessing: boolean
  isDemoMode: boolean
  initialChannel?: OnlinePaymentChannel
  onClose: () => void
  onPay: (channel: OnlinePaymentChannel) => void
}

const CHANNEL_ICONS: Record<
  OnlinePaymentChannel,
  typeof CreditCard
> = {
  upi: Smartphone,
  card: CreditCard,
  netbanking: Building2,
  wallet: Wallet,
}

export function PaymentCheckoutModal({
  isOpen,
  amount,
  orderNumber,
  isProcessing,
  isDemoMode,
  initialChannel = 'upi',
  onClose,
  onPay,
}: PaymentCheckoutModalProps) {
  const [channel, setChannel] = useState<OnlinePaymentChannel>(initialChannel)
  const [upiId, setUpiId] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvv, setCardCvv] = useState('')
  const [cardName, setCardName] = useState('')
  const [bank, setBank] = useState('')
  const [wallet, setWallet] = useState('paytm')
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setChannel(initialChannel)
    setFormError(null)
  }, [isOpen, initialChannel])

  const validate = (): boolean => {
    if (channel === 'upi') {
      if (!/^[\w.-]+@[\w.-]+$/.test(upiId.trim())) {
        setFormError('Enter a valid UPI ID (e.g. name@upi)')
        return false
      }
    }

    if (channel === 'card') {
      const digits = cardNumber.replace(/\s/g, '')
      if (!/^\d{16}$/.test(digits)) {
        setFormError('Enter a valid 16-digit card number')
        return false
      }
      if (!/^\d{2}\/\d{2}$/.test(cardExpiry.trim())) {
        setFormError('Enter expiry as MM/YY')
        return false
      }
      if (!/^\d{3,4}$/.test(cardCvv.trim())) {
        setFormError('Enter a valid CVV')
        return false
      }
      if (!cardName.trim()) {
        setFormError('Enter the name on card')
        return false
      }
    }

    if (channel === 'netbanking' && !bank) {
      setFormError('Select your bank')
      return false
    }

    setFormError(null)
    return true
  }

  const handlePay = () => {
    if (!validate()) return
    onPay(channel)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Complete Payment"
      className="max-w-lg"
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isProcessing}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handlePay}
            disabled={isProcessing}
            className="w-full sm:w-auto"
          >
            {isProcessing ? 'Processing...' : `Pay ${formatPrice(amount)}`}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="rounded-[var(--radius-card)] bg-primary/5 p-4">
          <p className="text-sm text-text-secondary">Order {orderNumber}</p>
          <p className="mt-1 text-2xl font-semibold text-primary">
            {formatPrice(amount)}
          </p>
          {isDemoMode && (
            <p className="mt-2 text-xs text-text-secondary">
              Demo mode — no real charge. Add{' '}
              <code className="rounded bg-black/5 px-1">VITE_RAZORPAY_KEY_ID</code>{' '}
              later for live Razorpay.
            </p>
          )}
        </div>

        <div>
          <p className="mb-3 text-sm font-medium text-text-primary">
            Choose how to pay
          </p>
          <div className="grid grid-cols-2 gap-2">
            {ONLINE_PAYMENT_CHANNELS.map((option) => {
              const Icon = CHANNEL_ICONS[option.id]
              const selected = channel === option.id

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    setChannel(option.id)
                    setFormError(null)
                  }}
                  className={cn(
                    'flex flex-col items-start gap-1 rounded-[var(--radius-button)] border p-3 text-left transition-colors',
                    selected
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-primary/30',
                  )}
                >
                  <Icon
                    className={cn(
                      'h-5 w-5',
                      selected ? 'text-primary' : 'text-text-secondary',
                    )}
                    aria-hidden="true"
                  />
                  <span className="text-sm font-semibold text-text-primary">
                    {option.label}
                  </span>
                  <span className="text-xs text-text-secondary">
                    {option.description}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="space-y-3 border-t border-black/5 pt-4">
          {channel === 'upi' && (
            <Input
              label="UPI ID"
              placeholder="yourname@upi"
              value={upiId}
              onChange={(event) => setUpiId(event.target.value)}
              autoComplete="off"
            />
          )}

          {channel === 'card' && (
            <>
              <Input
                label="Card Number"
                placeholder="XXXX XXXX XXXX XXXX"
                value={cardNumber}
                onChange={(event) => setCardNumber(event.target.value)}
                inputMode="numeric"
                autoComplete="cc-number"
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Expiry (MM/YY)"
                  placeholder="08/28"
                  value={cardExpiry}
                  onChange={(event) => setCardExpiry(event.target.value)}
                  autoComplete="cc-exp"
                />
                <Input
                  label="CVV"
                  placeholder="123"
                  value={cardCvv}
                  onChange={(event) => setCardCvv(event.target.value)}
                  inputMode="numeric"
                  autoComplete="cc-csc"
                />
              </div>
              <Input
                label="Name on Card"
                placeholder="Name as on card"
                value={cardName}
                onChange={(event) => setCardName(event.target.value)}
                autoComplete="cc-name"
              />
            </>
          )}

          {channel === 'netbanking' && (
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-text-primary">Bank</span>
              <select
                value={bank}
                onChange={(event) => setBank(event.target.value)}
                className="h-11 w-full rounded-[var(--radius-input)] border border-gray-300 bg-surface px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Select bank</option>
                <option value="sbi">State Bank of India</option>
                <option value="hdfc">HDFC Bank</option>
                <option value="icici">ICICI Bank</option>
                <option value="axis">Axis Bank</option>
                <option value="kotak">Kotak Mahindra Bank</option>
              </select>
            </label>
          )}

          {channel === 'wallet' && (
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-text-primary">
                Wallet
              </span>
              <select
                value={wallet}
                onChange={(event) => setWallet(event.target.value)}
                className="h-11 w-full rounded-[var(--radius-input)] border border-gray-300 bg-surface px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="paytm">Paytm</option>
                <option value="amazonpay">Amazon Pay</option>
                <option value="phonepe">PhonePe Wallet</option>
                <option value="mobikwik">MobiKwik</option>
              </select>
            </label>
          )}

          {formError && (
            <p className="text-sm text-error" role="alert">
              {formError}
            </p>
          )}
        </div>
      </div>
    </Modal>
  )
}

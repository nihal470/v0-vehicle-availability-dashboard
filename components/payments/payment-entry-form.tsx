'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Plus, 
  Trash2, 
  Receipt, 
  User, 
  CreditCard, 
  Car, 
  FileText,
  Save,
  Printer,
  Building2
} from 'lucide-react'
import type { Vehicle, Payment, PaymentItem, PaymentMode } from '@/lib/types'

interface PaymentItemForm {
  invoice_no: string
  ra_no: string
  vehicle_reg_no: string
  description: string
  amount: string
}

interface Props {
  vehicles: Vehicle[]
  editPayment?: Payment | null
}

const paymentModes: { value: PaymentMode; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'card', label: 'Card' },
  { value: 'online', label: 'Online' },
]

export function PaymentEntryForm({ vehicles, editPayment }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(false)
  const [receiptNo, setReceiptNo] = useState('')
  
  // Form state
  const [form, setForm] = useState({
    receipt_date: new Date().toISOString().split('T')[0],
    branch_name: '',
    customer_name: '',
    customer_address: '',
    customer_phone: '',
    debitor_code: '',
    payment_mode: 'cash' as PaymentMode,
    currency: 'OMR',
    vehicle_id: '',
    agreement_no: '',
    remarks: '',
    cheque_no: '',
    reference_no: '',
    reference_date: '',
    bank_name: '',
    received_by: '',
  })
  
  const [items, setItems] = useState<PaymentItemForm[]>([
    { invoice_no: '', ra_no: '', vehicle_reg_no: '', description: '', amount: '' }
  ])

  // Generate receipt number on mount
  useEffect(() => {
    if (!editPayment) {
      generateReceiptNo()
    } else {
      // Load edit data
      setReceiptNo(editPayment.receipt_no)
      setForm({
        receipt_date: editPayment.receipt_date,
        branch_name: editPayment.branch_name || '',
        customer_name: editPayment.customer_name,
        customer_address: editPayment.customer_address || '',
        customer_phone: editPayment.customer_phone || '',
        debitor_code: editPayment.debitor_code || '',
        payment_mode: editPayment.payment_mode,
        currency: editPayment.currency || 'OMR',
        vehicle_id: editPayment.vehicle_id || '',
        agreement_no: editPayment.agreement_no || '',
        remarks: editPayment.remarks || '',
        cheque_no: editPayment.cheque_no || '',
        reference_no: editPayment.reference_no || '',
        reference_date: editPayment.reference_date || '',
        bank_name: editPayment.bank_name || '',
        received_by: editPayment.received_by || '',
      })
      if (editPayment.items && editPayment.items.length > 0) {
        setItems(editPayment.items.map(item => ({
          invoice_no: item.invoice_no || '',
          ra_no: item.ra_no || '',
          vehicle_reg_no: item.vehicle_reg_no || '',
          description: item.description || '',
          amount: item.amount.toString(),
        })))
      }
    }
  }, [editPayment])

  const generateReceiptNo = async () => {
    // Generate a unique receipt number
    const timestamp = Date.now().toString().slice(-8)
    const random = Math.floor(Math.random() * 100).toString().padStart(2, '0')
    setReceiptNo(`${timestamp}${random}`)
  }

  const addItem = () => {
    setItems([...items, { invoice_no: '', ra_no: '', vehicle_reg_no: '', description: '', amount: '' }])
  }

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  const updateItem = (index: number, field: keyof PaymentItemForm, value: string) => {
    const newItems = [...items]
    newItems[index][field] = value
    setItems(newItems)
  }

  const totalAmount = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Create payment record
      const paymentData = {
        receipt_no: receiptNo,
        receipt_date: form.receipt_date,
        branch_name: form.branch_name || null,
        customer_name: form.customer_name,
        customer_address: form.customer_address || null,
        customer_phone: form.customer_phone || null,
        debitor_code: form.debitor_code || null,
        payment_mode: form.payment_mode,
        currency: form.currency,
        vehicle_id: form.vehicle_id || null,
        agreement_no: form.agreement_no || null,
        total_amount: totalAmount,
        remarks: form.remarks || null,
        cheque_no: form.cheque_no || null,
        reference_no: form.reference_no || null,
        reference_date: form.reference_date || null,
        bank_name: form.bank_name || null,
        received_by: form.received_by || null,
      }

      let paymentId: string

      if (editPayment) {
        // Update existing payment
        const { error } = await supabase
          .from('payments')
          .update(paymentData)
          .eq('id', editPayment.id)
        
        if (error) throw error
        paymentId = editPayment.id

        // Delete existing items
        await supabase.from('payment_items').delete().eq('payment_id', paymentId)
      } else {
        // Insert new payment
        const { data, error } = await supabase
          .from('payments')
          .insert(paymentData)
          .select('id')
          .single()
        
        if (error) throw error
        paymentId = data.id
      }

      // Insert payment items
      const validItems = items.filter(item => item.amount && parseFloat(item.amount) > 0)
      if (validItems.length > 0) {
        const itemsData = validItems.map(item => ({
          payment_id: paymentId,
          invoice_no: item.invoice_no || null,
          ra_no: item.ra_no || null,
          vehicle_reg_no: item.vehicle_reg_no || null,
          description: item.description || null,
          amount: parseFloat(item.amount),
        }))

        const { error: itemsError } = await supabase.from('payment_items').insert(itemsData)
        if (itemsError) throw itemsError
      }

      router.push(`/payments?created=${receiptNo}`)
      router.refresh()
    } catch (error) {
      console.error('Error saving payment:', error)
      alert('Failed to save payment. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const selectedVehicle = vehicles.find(v => v.id === form.vehicle_id)

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Payment Entry</h1>
          <p className="text-muted-foreground">Create a new payment receipt</p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2 font-mono">
          Receipt # {receiptNo}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Customer & Payment Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Information */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5 text-primary" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="customer_name">Customer Name *</Label>
                <Input
                  id="customer_name"
                  value={form.customer_name}
                  onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                  placeholder="Enter customer name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer_phone">Phone Number</Label>
                <Input
                  id="customer_phone"
                  value={form.customer_phone}
                  onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
                  placeholder="Enter phone number"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="customer_address">Address</Label>
                <Input
                  id="customer_address"
                  value={form.customer_address}
                  onChange={(e) => setForm({ ...form, customer_address: e.target.value })}
                  placeholder="Enter customer address"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="debitor_code">Debitor Code</Label>
                <Input
                  id="debitor_code"
                  value={form.debitor_code}
                  onChange={(e) => setForm({ ...form, debitor_code: e.target.value })}
                  placeholder="e.g., 000001"
                />
              </div>
            </CardContent>
          </Card>

          {/* Payment Items */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5 text-primary" />
                  Payment Items
                </CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Header Row */}
                <div className="hidden sm:grid sm:grid-cols-12 gap-2 text-sm font-medium text-muted-foreground px-2">
                  <div className="col-span-2">Invoice No</div>
                  <div className="col-span-2">RA No</div>
                  <div className="col-span-2">Vehicle Reg</div>
                  <div className="col-span-4">Description</div>
                  <div className="col-span-2 text-right">Amount</div>
                </div>
                
                {items.map((item, index) => (
                  <div key={index} className="grid sm:grid-cols-12 gap-2 items-start p-2 rounded-lg bg-muted/30">
                    <div className="sm:col-span-2">
                      <Label className="sm:hidden text-xs">Invoice No</Label>
                      <Input
                        value={item.invoice_no}
                        onChange={(e) => updateItem(index, 'invoice_no', e.target.value)}
                        placeholder="INV-001"
                        className="h-9"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="sm:hidden text-xs">RA No</Label>
                      <Input
                        value={item.ra_no}
                        onChange={(e) => updateItem(index, 'ra_no', e.target.value)}
                        placeholder="RA-001"
                        className="h-9"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="sm:hidden text-xs">Vehicle Reg</Label>
                      <Input
                        value={item.vehicle_reg_no}
                        onChange={(e) => updateItem(index, 'vehicle_reg_no', e.target.value)}
                        placeholder="ABC 123"
                        className="h-9"
                      />
                    </div>
                    <div className="sm:col-span-4">
                      <Label className="sm:hidden text-xs">Description</Label>
                      <Input
                        value={item.description}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                        placeholder="Payment description"
                        className="h-9"
                      />
                    </div>
                    <div className="sm:col-span-2 flex gap-1">
                      <div className="flex-1">
                        <Label className="sm:hidden text-xs">Amount</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.amount}
                          onChange={(e) => updateItem(index, 'amount', e.target.value)}
                          placeholder="0.00"
                          className="h-9 text-right"
                        />
                      </div>
                      {items.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-destructive hover:text-destructive"
                          onClick={() => removeItem(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}

                <Separator />
                
                {/* Total */}
                <div className="flex justify-end items-center gap-4 pt-2">
                  <span className="text-lg font-medium">Total Amount:</span>
                  <span className="text-2xl font-bold text-primary">
                    {form.currency} {totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Remarks */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Remarks</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={form.remarks}
                onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                placeholder="Add any additional notes or remarks..."
                rows={3}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Receipt & Payment Details */}
        <div className="space-y-6">
          {/* Receipt Details */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Receipt className="h-5 w-5 text-primary" />
                Receipt Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="receipt_date">Receipt Date *</Label>
                <Input
                  id="receipt_date"
                  type="date"
                  value={form.receipt_date}
                  onChange={(e) => setForm({ ...form, receipt_date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="branch_name">Branch</Label>
                <Input
                  id="branch_name"
                  value={form.branch_name}
                  onChange={(e) => setForm({ ...form, branch_name: e.target.value })}
                  placeholder="Enter branch name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OMR">OMR - Omani Rial</SelectItem>
                    <SelectItem value="AED">AED - UAE Dirham</SelectItem>
                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Payment Method */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <CreditCard className="h-5 w-5 text-primary" />
                Payment Method
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Payment Mode *</Label>
                <Select value={form.payment_mode} onValueChange={(v) => setForm({ ...form, payment_mode: v as PaymentMode })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentModes.map((mode) => (
                      <SelectItem key={mode.value} value={mode.value}>
                        {mode.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {(form.payment_mode === 'cheque' || form.payment_mode === 'bank_transfer') && (
                <>
                  {form.payment_mode === 'cheque' && (
                    <div className="space-y-2">
                      <Label htmlFor="cheque_no">Cheque No</Label>
                      <Input
                        id="cheque_no"
                        value={form.cheque_no}
                        onChange={(e) => setForm({ ...form, cheque_no: e.target.value })}
                        placeholder="Enter cheque number"
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="bank_name">Bank Name</Label>
                    <Input
                      id="bank_name"
                      value={form.bank_name}
                      onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                      placeholder="Enter bank name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reference_no">Reference No</Label>
                    <Input
                      id="reference_no"
                      value={form.reference_no}
                      onChange={(e) => setForm({ ...form, reference_no: e.target.value })}
                      placeholder="Enter reference number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reference_date">Reference Date</Label>
                    <Input
                      id="reference_date"
                      type="date"
                      value={form.reference_date}
                      onChange={(e) => setForm({ ...form, reference_date: e.target.value })}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Vehicle Link */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Car className="h-5 w-5 text-primary" />
                Link to Vehicle
              </CardTitle>
              <CardDescription>Optional - link this payment to a vehicle</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Vehicle</Label>
                <Select value={form.vehicle_id} onValueChange={(v) => setForm({ ...form, vehicle_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {vehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.license_plate} - {vehicle.make} {vehicle.model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedVehicle && (
                <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                  {selectedVehicle.make} {selectedVehicle.model} ({selectedVehicle.year})
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="agreement_no">Agreement No</Label>
                <Input
                  id="agreement_no"
                  value={form.agreement_no}
                  onChange={(e) => setForm({ ...form, agreement_no: e.target.value })}
                  placeholder="e.g., AGR-001"
                />
              </div>
            </CardContent>
          </Card>

          {/* Received By */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building2 className="h-5 w-5 text-primary" />
                Received By
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                value={form.received_by}
                onChange={(e) => setForm({ ...form, received_by: e.target.value })}
                placeholder="Staff name"
              />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <Button type="submit" disabled={isLoading || !form.customer_name} className="w-full">
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? 'Saving...' : editPayment ? 'Update Payment' : 'Save Payment'}
            </Button>
            <Button type="button" variant="outline" className="w-full" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </form>
  )
}

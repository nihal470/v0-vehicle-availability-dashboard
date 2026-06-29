'use client'

import { useState, useEffect } from 'react'
import { VehicleCategory, VehicleStatus, BRANCHES, type Branch } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Car, Shield, FileText, Wrench, Gauge, Loader2, Plus, Building2, Pencil, Check, X, Trash2, Tag } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Props {
  categories: VehicleCategory[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

const statusOptions: { value: VehicleStatus; label: string }[] = [
  { value: 'available', label: 'Reserved' },
  { value: 'running', label: 'Running' },
  { value: 'idle', label: 'Idle' },
  { value: 'garage', label: 'In Garage' },
  { value: 'maintenance', label: 'Maintenance' },
]

export function AddVehicleModal({ categories, open, onOpenChange }: Props) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [categoryList, setCategoryList] = useState<VehicleCategory[]>(categories)
  const [showManageCategories, setShowManageCategories] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [editingCategoryName, setEditingCategoryName] = useState('')
  const [categoryBusy, setCategoryBusy] = useState(false)

  // Keep local category list in sync with the prop
  useEffect(() => {
    setCategoryList(categories)
  }, [categories])

  const refreshCategories = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('vehicle_categories')
      .select('*')
      .order('name')
    if (data) setCategoryList(data)
    router.refresh()
  }

  const handleCreateCategory = async () => {
    const name = newCategoryName.trim()
    if (!name) return
    setCategoryBusy(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('vehicle_categories')
      .insert({ name })
    setCategoryBusy(false)
    if (error) {
      alert('Error creating category: ' + error.message)
      return
    }
    setNewCategoryName('')
    await refreshCategories()
  }

  const handleUpdateCategory = async (id: string) => {
    const name = editingCategoryName.trim()
    if (!name) return
    setCategoryBusy(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('vehicle_categories')
      .update({ name })
      .eq('id', id)
    setCategoryBusy(false)
    if (error) {
      alert('Error updating category: ' + error.message)
      return
    }
    setEditingCategoryId(null)
    setEditingCategoryName('')
    await refreshCategories()
  }

  const handleDeleteCategory = async (category: VehicleCategory) => {
    if (!confirm(`Delete category "${category.name}"? Vehicles using it will have no category.`)) return
    setCategoryBusy(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('vehicle_categories')
      .delete()
      .eq('id', category.id)
    setCategoryBusy(false)
    if (error) {
      alert('Error deleting category: ' + error.message)
      return
    }
    if (formData.category_id === category.id) {
      setFormData(prev => ({ ...prev, category_id: '' }))
    }
    await refreshCategories()
  }

  const [formData, setFormData] = useState({
    make: '',
    model: '',
    license_plate: '',
    year: new Date().getFullYear().toString(),
    color: '',
    category_id: '',
    status: 'idle' as VehicleStatus,
    ownership_type: 'owned' as 'owned' | 'leased',
    branch: 'Muscat' as Branch,
    insurance_start_date: '',
    insurance_end_date: '',
    mulkiya_renewal_date: '',
    last_service_date: '',
    last_service_km: '',
    current_km: '',
    next_service_km: '',
    next_service_date: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.make || !formData.model || !formData.license_plate) {
      alert('Please fill in Make, Model, and License Plate')
      return
    }

    setIsLoading(true)

    const supabase = createClient()

    const { error } = await supabase
      .from('vehicles')
      .insert({
        make: formData.make,
        model: formData.model,
        license_plate: formData.license_plate,
        year: formData.year ? parseInt(formData.year) : null,
        color: formData.color || null,
        category_id: formData.category_id || null,
        status: formData.status,
        ownership_type: formData.ownership_type,
        branch: formData.branch,
        insurance_start_date: formData.insurance_start_date || null,
        insurance_end_date: formData.insurance_end_date || null,
        mulkiya_renewal_date: formData.mulkiya_renewal_date || null,
        last_service_date: formData.last_service_date || null,
        last_service_km: formData.last_service_km ? parseInt(formData.last_service_km) : null,
        current_km: formData.current_km ? parseInt(formData.current_km) : null,
        next_service_km: formData.next_service_km ? parseInt(formData.next_service_km) : null,
        next_service_date: formData.next_service_date || null,
      })

    setIsLoading(false)

    if (error) {
      alert('Error adding vehicle: ' + error.message)
    } else {
      // Reset form
      setFormData({
        make: '',
        model: '',
        license_plate: '',
        year: new Date().getFullYear().toString(),
        color: '',
        category_id: '',
        status: 'idle',
        ownership_type: 'owned',
        branch: 'Muscat',
        insurance_start_date: '',
        insurance_end_date: '',
        mulkiya_renewal_date: '',
        last_service_date: '',
        last_service_km: '',
        current_km: '',
        next_service_km: '',
        next_service_date: '',
      })
      router.refresh()
      onOpenChange(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Add New Vehicle
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Car className="h-4 w-4 text-primary" />
                Vehicle Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="make">Make *</Label>
                  <Input
                    id="make"
                    placeholder="e.g., Toyota, Honda"
                    value={formData.make}
                    onChange={(e) => handleInputChange('make', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">Model *</Label>
                  <Input
                    id="model"
                    placeholder="e.g., Camry, Civic"
                    value={formData.model}
                    onChange={(e) => handleInputChange('model', e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="license_plate">License Plate *</Label>
                  <Input
                    id="license_plate"
                    placeholder="e.g., 1234 AB"
                    value={formData.license_plate}
                    onChange={(e) => handleInputChange('license_plate', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="year">Year</Label>
                  <Input
                    id="year"
                    type="number"
                    placeholder="e.g., 2024"
                    value={formData.year}
                    onChange={(e) => handleInputChange('year', e.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="color">Color</Label>
                  <Input
                    id="color"
                    placeholder="e.g., White, Black"
                    value={formData.color}
                    onChange={(e) => handleInputChange('color', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="category">Category</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-primary hover:text-primary"
                      onClick={() => setShowManageCategories(true)}
                    >
                      <Tag className="h-3.5 w-3.5 mr-1" />
                      Manage
                    </Button>
                  </div>
                  <Select 
                    value={formData.category_id} 
                    onValueChange={(value) => handleInputChange('category_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryList.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(value) => handleInputChange('status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ownership_type">Ownership Type</Label>
                  <Select 
                    value={formData.ownership_type} 
                    onValueChange={(value) => handleInputChange('ownership_type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select ownership" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="owned">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-emerald-600" />
                          Owned
                        </div>
                      </SelectItem>
                      <SelectItem value="leased">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-blue-600" />
                          Leased
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="branch">Branch</Label>
                  <Select
                    value={formData.branch}
                    onValueChange={(value) => handleInputChange('branch', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {BRANCHES.map((branch) => (
                        <SelectItem key={branch} value={branch}>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-primary" />
                            {branch}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Insurance Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-4 w-4 text-primary" />
                Car Insurance
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="insurance_start_date">Insurance Start Date</Label>
                <Input
                  id="insurance_start_date"
                  type="date"
                  value={formData.insurance_start_date}
                  onChange={(e) => handleInputChange('insurance_start_date', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="insurance_end_date">Insurance End Date</Label>
                <Input
                  id="insurance_end_date"
                  type="date"
                  value={formData.insurance_end_date}
                  onChange={(e) => handleInputChange('insurance_end_date', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Mulkiya Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4 text-primary" />
                Mulkiya (Registration)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="mulkiya_renewal_date">Mulkiya Renewal Date</Label>
                <Input
                  id="mulkiya_renewal_date"
                  type="date"
                  value={formData.mulkiya_renewal_date}
                  onChange={(e) => handleInputChange('mulkiya_renewal_date', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Service Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Wrench className="h-4 w-4 text-primary" />
                Service Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="last_service_date">Last Service Date</Label>
                  <Input
                    id="last_service_date"
                    type="date"
                    value={formData.last_service_date}
                    onChange={(e) => handleInputChange('last_service_date', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_service_km">Last Service KM</Label>
                  <Input
                    id="last_service_km"
                    type="number"
                    placeholder="e.g., 40000"
                    value={formData.last_service_km}
                    onChange={(e) => handleInputChange('last_service_km', e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="next_service_date">Next Service Due (Date)</Label>
                <Input
                  id="next_service_date"
                  type="date"
                  value={formData.next_service_date}
                  onChange={(e) => handleInputChange('next_service_date', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Kilometers Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Gauge className="h-4 w-4 text-primary" />
                Kilometer Tracking
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="current_km">Current Running KM</Label>
                <Input
                  id="current_km"
                  type="number"
                  placeholder="e.g., 45000"
                  value={formData.current_km}
                  onChange={(e) => handleInputChange('current_km', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="next_service_km">Next Service Due (KM)</Label>
                <Input
                  id="next_service_km"
                  type="number"
                  placeholder="e.g., 50000"
                  value={formData.next_service_km}
                  onChange={(e) => handleInputChange('next_service_km', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Vehicle
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    {/* Manage Categories Dialog */}
    <Dialog open={showManageCategories} onOpenChange={setShowManageCategories}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" />
            Manage Vehicle Categories
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Create new category */}
          <div className="space-y-2">
            <Label>Create New Category</Label>
            <div className="flex items-center gap-2">
              <Input
                placeholder="e.g., SUV, Sedan, Pickup"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleCreateCategory()
                  }
                }}
              />
              <Button
                type="button"
                className="shrink-0"
                disabled={categoryBusy || !newCategoryName.trim()}
                onClick={handleCreateCategory}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
          </div>

          {/* Existing categories */}
          <div className="space-y-2">
            <Label>Existing Categories</Label>
            <div className="max-h-64 overflow-y-auto space-y-2 rounded-md border p-2">
              {categoryList.length === 0 && (
                <p className="text-sm text-muted-foreground p-2 text-center">No categories yet</p>
              )}
              {categoryList.map((category) => (
                <div key={category.id} className="flex items-center gap-2 rounded-md bg-muted/40 p-2">
                  {editingCategoryId === category.id ? (
                    <>
                      <Input
                        autoFocus
                        value={editingCategoryName}
                        onChange={(e) => setEditingCategoryName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleUpdateCategory(category.id)
                          }
                        }}
                        className="h-8"
                      />
                      <Button
                        type="button"
                        size="icon"
                        className="h-8 w-8 shrink-0 bg-emerald-600 hover:bg-emerald-700"
                        disabled={categoryBusy || !editingCategoryName.trim()}
                        onClick={() => handleUpdateCategory(category.id)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 shrink-0"
                        onClick={() => {
                          setEditingCategoryId(null)
                          setEditingCategoryName('')
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm font-medium">{category.name}</span>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 shrink-0"
                        onClick={() => {
                          setEditingCategoryId(category.id)
                          setEditingCategoryName(category.name)
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                        disabled={categoryBusy}
                        onClick={() => handleDeleteCategory(category)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setShowManageCategories(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}

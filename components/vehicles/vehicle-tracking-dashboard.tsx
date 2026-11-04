'use client'

import { useState, useMemo } from 'react'
import { Vehicle, VehicleCategory, BRANCHES } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  AlertTriangle, 
  FileText, 
  Wrench, 
  Car,
  Search,
  Bell,
  CheckCircle2,
  PauseCircle,
  Warehouse,
  PlayCircle,
  CircleDot,
  Plus,
  XCircle,
  ArrowRightLeft,
  CreditCard,
  ListChecks,
  MapPin,
  Car as CarIcon,
  Plane,
  Building2,
  LogOut,
  Archive,
  Eye,
  EyeOff,
  Camera,
  MoreHorizontal
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { generateAlerts } from './active-alerts'
import { VehicleDetailsModal } from './vehicle-details-modal'
import { AddVehicleModal } from './add-vehicle-modal'
import { CloseAgreementModal } from './close-agreement-modal'
import { StartAgreementModal } from './start-agreement-modal'
import { MoveVehicleModal } from './move-vehicle-modal'
import { SetParkedLocationModal } from './set-parked-location-modal'
import { InspectionCaptureModal } from './inspection-capture-modal'
import { InspectionGalleryModal } from './inspection-gallery-modal'
import { UpdatePaymentModal } from './update-payment-modal'
import { BulkUpdateModal } from './bulk-update-modal'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Props {
  vehicles: Vehicle[]
  categories: VehicleCategory[]
}

export function VehicleTrackingDashboard({ vehicles, categories }: Props) {
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [branchFilter, setBranchFilter] = useState<string>('all')
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showCloseModal, setShowCloseModal] = useState(false)
  const [vehicleToClose, setVehicleToClose] = useState<Vehicle | null>(null)
  const [showStartModal, setShowStartModal] = useState(false)
  const [vehicleToStart, setVehicleToStart] = useState<Vehicle | null>(null)
  const [showEditAgreementModal, setShowEditAgreementModal] = useState(false)
  const [vehicleToEditAgreement, setVehicleToEditAgreement] = useState<Vehicle | null>(null)
  const [showMoveModal, setShowMoveModal] = useState(false)
  const [vehicleToMove, setVehicleToMove] = useState<Vehicle | null>(null)
  const [showParkedLocationModal, setShowParkedLocationModal] = useState(false)
  const [vehicleForParkedLocation, setVehicleForParkedLocation] = useState<Vehicle | null>(null)
  const [showInspectionModal, setShowInspectionModal] = useState(false)
  const [showGalleryModal, setShowGalleryModal] = useState(false)
  const [vehicleForInspection, setVehicleForInspection] = useState<Vehicle | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [vehicleForPayment, setVehicleForPayment] = useState<Vehicle | null>(null)
  const [showBulkUpdateModal, setShowBulkUpdateModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showReturnedVehicles, setShowReturnedVehicles] = useState(false)
  
  const supabase = createClient()
  const router = useRouter()

  // Handle marking a leased vehicle as returned
  const handleRemoveCancelledVehicle = async (vehicle: Vehicle) => {
    if (!confirm(`Remove ${vehicle.make} ${vehicle.model} (${vehicle.license_plate}) from the active fleet? The vehicle will be archived and its history will be retained.`)) return
    const { error } = await supabase.from('vehicles').update({ status: 'archived', updated_at: new Date().toISOString() }).eq('id', vehicle.id)
    if (error) {
      console.error('Error archiving vehicle:', error)
      alert('Failed to remove the vehicle. Please try again.')
      return
    }
    router.refresh()
  }

  const handleMarkAsReturned = async (vehicle: Vehicle) => {
    if (!confirm(`Are you sure you want to mark "${vehicle.make} ${vehicle.model}" (${vehicle.license_plate}) as returned?\n\nThis will:\n- Change status to Inactive\n- Exclude from Active Fleet count\n- Hide from operational dashboards\n\nAll history will be retained for audit purposes.`)) {
      return
    }
    
    try {
      const { error } = await supabase
        .from('vehicles')
        .update({ 
          status: 'returned',
          customer_name: null,
          return_date: null,
          ag_no: null,
          rental_type: null,
          rental_renewal_date: null,
          payment_status: null,
          payment_date: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', vehicle.id)
      
      if (error) throw error
      
      router.refresh()
    } catch (error) {
      console.error('Error marking vehicle as returned:', error)
      alert('Failed to mark vehicle as returned. Please try again.')
    }
  }

  // Filter out returned vehicles for active fleet
  const archivedVehicles = useMemo(() => vehicles.filter(v => v.status === 'archived'), [vehicles])
  const activeVehicles = useMemo(() => vehicles.filter(v => v.status !== 'returned' && v.status !== 'archived'), [vehicles])
  const returnedVehicles = useMemo(() => vehicles.filter(v => v.status === 'returned'), [vehicles])

  const alerts = useMemo(() => generateAlerts(activeVehicles), [activeVehicles])
  
  const criticalAlerts = alerts.filter(a => a.severity === 'critical')
  const warningAlerts = alerts.filter(a => a.severity === 'warning')
  
  // Vehicle status counts (excluding returned)
  const statusCounts = useMemo(() => ({
    idle: activeVehicles.filter(v => v.status === 'idle').length,
    garage: activeVehicles.filter(v => v.status === 'garage').length,
    running: activeVehicles.filter(v => v.status === 'running').length,
    available: activeVehicles.filter(v => v.status === 'available').length,
    maintenance: activeVehicles.filter(v => v.status === 'maintenance').length,
    returned: returnedVehicles.length,
  }), [activeVehicles, returnedVehicles])

  const filteredVehicles = useMemo(() => {
    // Use active vehicles by default, or include returned if filter is specifically 'returned' or showReturnedVehicles is true
    const baseVehicles = statusFilter === 'returned' 
      ? returnedVehicles 
      : showReturnedVehicles 
        ? vehicles
        : activeVehicles
    
    return baseVehicles.filter((vehicle) => {
      const matchesSearch = 
        vehicle.license_plate.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vehicle.make.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vehicle.model.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesCategory = categoryFilter === 'all' || vehicle.category_id === categoryFilter
      
      const matchesStatus = statusFilter === 'all' || vehicle.status === statusFilter

      const matchesBranch = branchFilter === 'all' || (vehicle.branch || 'Muscat') === branchFilter

      return matchesSearch && matchesCategory && matchesStatus && matchesBranch
    })
  }, [vehicles, activeVehicles, returnedVehicles, searchQuery, categoryFilter, statusFilter, branchFilter, showReturnedVehicles])

  return (
    <div className="space-y-6">
      {/* Alert Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Fleet</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeVehicles.length}</div>
            <p className="text-xs text-muted-foreground">
              {returnedVehicles.length > 0 && (
                <span className="text-slate-500">+{returnedVehicles.length} returned</span>
              )}
              {returnedVehicles.length === 0 && 'In fleet'}
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-destructive">Critical Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{criticalAlerts.length}</div>
            <p className="text-xs text-muted-foreground">Require immediate attention</p>
          </CardContent>
        </Card>

        <Card className="border-accent/50 bg-accent/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-accent-foreground">Warnings</CardTitle>
            <Bell className="h-4 w-4 text-accent-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent-foreground">{warningAlerts.length}</div>
            <p className="text-xs text-muted-foreground">Upcoming deadlines</p>
          </CardContent>
        </Card>

        <Card className="border-green-500/50 bg-green-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-green-700">All Clear</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              {vehicles.length - new Set(alerts.map(a => a.vehicleId)).size}
            </div>
            <p className="text-xs text-muted-foreground">No issues</p>
          </CardContent>
        </Card>
      </div>

      {/* Vehicle Status Filter Buttons */}
      <Card className="overflow-hidden">
        <CardHeader className="px-4 py-3">
          <CardTitle className="text-sm font-semibold">Filter by Vehicle Status</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            <Button
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              className="flex min-h-14 h-auto flex-col gap-0.5 px-2 py-2"
              onClick={() => setStatusFilter('all')}
            >
              <Car className="h-4 w-4" />
              <span className="text-base font-bold">{vehicles.length}</span>
              <span className="text-xs">All Vehicles</span>
            </Button>
            
            <Button
              variant={statusFilter === 'running' ? 'default' : 'outline'}
              className={`flex min-h-14 h-auto flex-col gap-0.5 px-2 py-2 ${statusFilter === 'running' ? 'bg-emerald-600 hover:bg-emerald-700' : 'border-emerald-500/50 text-emerald-700 hover:bg-emerald-50'}`}
              onClick={() => setStatusFilter('running')}
            >
              <PlayCircle className="h-4 w-4" />
              <span className="text-base font-bold">{statusCounts.running}</span>
              <span className="text-xs">Running</span>
            </Button>
            
            <Button
              variant={statusFilter === 'idle' ? 'default' : 'outline'}
              className={`flex min-h-14 h-auto flex-col gap-0.5 px-2 py-2 ${statusFilter === 'idle' ? 'bg-amber-500 hover:bg-amber-600' : 'border-amber-500/50 text-amber-700 hover:bg-amber-50'}`}
              onClick={() => setStatusFilter('idle')}
            >
              <PauseCircle className="h-4 w-4" />
              <span className="text-base font-bold">{statusCounts.idle}</span>
              <span className="text-xs">Idle</span>
            </Button>
            
            <Button
              variant={statusFilter === 'garage' ? 'default' : 'outline'}
              className={`flex min-h-14 h-auto flex-col gap-0.5 px-2 py-2 ${statusFilter === 'garage' ? 'bg-slate-600 hover:bg-slate-700' : 'border-slate-500/50 text-slate-700 hover:bg-slate-50'}`}
              onClick={() => setStatusFilter('garage')}
            >
              <Warehouse className="h-4 w-4" />
              <span className="text-base font-bold">{statusCounts.garage}</span>
              <span className="text-xs">In Garage</span>
            </Button>
            
            <Button
              variant={statusFilter === 'available' ? 'default' : 'outline'}
              className={`flex min-h-14 h-auto flex-col gap-0.5 px-2 py-2 ${statusFilter === 'available' ? 'bg-sky-600 hover:bg-sky-700' : 'border-sky-500/50 text-sky-700 hover:bg-sky-50'}`}
              onClick={() => setStatusFilter('available')}
            >
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-base font-bold">{statusCounts.available}</span>
              <span className="text-xs">Reserved</span>
            </Button>
            
            <Button
              variant={statusFilter === 'maintenance' ? 'default' : 'outline'}
              className={`flex min-h-14 h-auto flex-col gap-0.5 px-2 py-2 ${statusFilter === 'maintenance' ? 'bg-purple-600 hover:bg-purple-700' : 'border-purple-500/50 text-purple-700 hover:bg-purple-50'}`}
              onClick={() => setStatusFilter('maintenance')}
            >
              <Wrench className="h-4 w-4" />
              <span className="text-base font-bold">{statusCounts.maintenance}</span>
              <span className="text-xs">Maintenance</span>
            </Button>
            
            {/* Returned vehicles can be selected to reveal the archive action in each row */}
            <Button
              variant={statusFilter === 'returned' ? 'default' : 'outline'}
              className={`flex min-h-14 h-auto flex-col gap-0.5 px-2 py-2 ${statusFilter === 'returned' ? 'bg-rose-600 hover:bg-rose-700' : 'border-rose-500/50 text-rose-700 hover:bg-rose-50'}`}
              onClick={() => setStatusFilter('returned')}
            >
              <Archive className="h-4 w-4" />
              <span className="text-base font-bold">{statusCounts.returned}</span>
              <span className="text-xs">Returned / Remove</span>
            </Button>
          </div>
        </CardContent>
      </Card>



      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by license plate, make, or model..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={branchFilter} onValueChange={setBranchFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="All Branches" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Branches</SelectItem>
            {BRANCHES.map((branch) => (
              <SelectItem key={branch} value={branch}>
                {branch}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Vehicle List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Vehicle Details & Tracking</CardTitle>
            {statusFilter === 'returned' && <p className="mt-1 text-sm text-muted-foreground">Select the three-dot menu on a returned vehicle, then choose “Remove returned vehicle”.</p>}
            {statusFilter !== 'returned' && <p className="mt-1 text-sm text-muted-foreground">For an owned vehicle, open the three-dot menu and choose “Remove owned vehicle” to archive it while keeping its history.</p>}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setShowBulkUpdateModal(true)}>
              <ListChecks className="mr-2 h-4 w-4" />
              Bulk Mulkiya Update
            </Button>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Vehicle
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-3 text-left text-sm font-medium">Vehicle</th>
                  <th className="p-3 text-left text-sm font-medium">License Plate</th>
                  <th className="p-3 text-left text-sm font-medium">Own/Lease</th>
                    <th className="p-3 text-left text-sm font-medium">Status</th>
                    <th className="p-3 text-left text-sm font-medium">Current Branch</th>
                    <th className="p-3 text-left text-sm font-medium">Parked Location</th>
                      <th className="p-3 text-left text-sm font-medium">Customer Name</th>
                      <th className="p-3 text-left text-sm font-medium">Start Date</th>
                      <th className="p-3 text-left text-sm font-medium">Return Date</th>
                  <th className="p-3 text-left text-sm font-medium">AG No</th>
                  <th className="p-3 text-left text-sm font-medium">Rental</th>

                  <th className="p-3 text-left text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredVehicles.map((vehicle) => {
                  return (
                    <tr key={vehicle.id} className="border-b hover:bg-muted/30">
                      <td className="p-3">
                        <div className="font-medium">{vehicle.make} {vehicle.model}</div>
                        <div className="text-sm text-muted-foreground">{vehicle.category?.name}</div>
                      </td>
                      <td className="p-3 font-mono">{vehicle.license_plate}</td>
                      <td className="p-3">
                        <Badge variant="outline" className={
                          vehicle.ownership_type === 'leased' 
                            ? 'border-blue-500 text-blue-600 bg-blue-50' 
                            : 'border-emerald-500 text-emerald-600 bg-emerald-50'
                        }>
                          {vehicle.ownership_type === 'leased' ? 'Leased' : 'Owned'}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Badge className={
                          vehicle.status === 'running' ? 'bg-emerald-500 hover:bg-emerald-600' :
                          vehicle.status === 'idle' ? 'bg-amber-500 hover:bg-amber-600' :
                          vehicle.status === 'garage' ? 'bg-slate-500 hover:bg-slate-600' :
                          vehicle.status === 'available' ? 'bg-sky-500 hover:bg-sky-600' :
                          vehicle.status === 'maintenance' ? 'bg-purple-500 hover:bg-purple-600' :
                          vehicle.status === 'returned' ? 'bg-rose-500 hover:bg-rose-600' :
                          'bg-gray-500'
                        }>
                          {vehicle.status === 'running' && <PlayCircle className="h-3 w-3 mr-1" />}
                          {vehicle.status === 'idle' && <PauseCircle className="h-3 w-3 mr-1" />}
                          {vehicle.status === 'garage' && <Warehouse className="h-3 w-3 mr-1" />}
                          {vehicle.status === 'available' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                          {vehicle.status === 'maintenance' && <Wrench className="h-3 w-3 mr-1" />}
                          {vehicle.status === 'returned' && <Archive className="h-3 w-3 mr-1" />}
                          {vehicle.status === 'returned' ? 'Inactive' : vehicle.status.charAt(0).toUpperCase() + vehicle.status.slice(1)}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className={
                          vehicle.branch === 'Salalah'
                            ? 'border-orange-500 text-orange-600 bg-orange-50'
                            : 'border-indigo-500 text-indigo-600 bg-indigo-50'
                        }>
                          <Building2 className="h-3 w-3 mr-1" />
                          {vehicle.branch || 'Muscat'}
                        </Badge>
                      </td>
                      <td className="p-3">
                        {vehicle.status === 'idle' && vehicle.parked_location ? (
                          <div className="flex items-center gap-2">
                            {vehicle.parked_location_photo && (
                              <a
                                href={vehicle.parked_location_photo}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="shrink-0"
                                title="View parking photo"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={vehicle.parked_location_photo || "/placeholder.svg"}
                                  alt="Parking location"
                                  className="h-9 w-9 rounded object-cover border hover:ring-2 hover:ring-amber-400"
                                />
                              </a>
                            )}
                            <div className="flex items-center gap-1.5">
                              {vehicle.parked_location === 'car_wash' && <CarIcon className="h-4 w-4 text-amber-600" />}
                              {vehicle.parked_location === 'airport' && <Plane className="h-4 w-4 text-amber-600" />}
                              {vehicle.parked_location === 'office_front' && <Building2 className="h-4 w-4 text-amber-600" />}
                              {vehicle.parked_location === 'custom' && <MapPin className="h-4 w-4 text-amber-600" />}
                              <span className="text-sm">
                                {vehicle.parked_location === 'car_wash' && 'Car Wash'}
                                {vehicle.parked_location === 'airport' && 'Airport'}
                                {vehicle.parked_location === 'office_front' && 'Office Front'}
                                {vehicle.parked_location === 'custom' && vehicle.parked_location_custom}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-3">
                        {vehicle.customer_name ? (
                          <span className="font-medium">{vehicle.customer_name}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-3">
                        {vehicle.start_date ? (
                          <span>{format(new Date(vehicle.start_date), 'dd-MMM-yy')}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-3">
                        {vehicle.return_date ? (
                          <span>{format(new Date(vehicle.return_date), 'dd-MMM-yy')}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-3 font-mono">
                        {vehicle.ag_no || <span className="text-muted-foreground">-</span>}
                      </td>
                      <td className="p-3">
                        {vehicle.rental_type ? (
                          <Badge variant="outline" className="uppercase">{vehicle.rental_type}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm">
                                <MoreHorizontal className="h-4 w-4 mr-1" />
                                Actions
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedVehicle(vehicle)
                                  setShowModal(true)
                                }}
                              >
                                <FileText className="h-4 w-4" />
                                Edit
                              </DropdownMenuItem>

                              {vehicle.status === 'idle' && !vehicle.customer_name && (
                                <DropdownMenuItem
                                  className="text-emerald-600 focus:text-emerald-600"
                                  onClick={() => {
                                    setVehicleToStart(vehicle)
                                    setShowStartModal(true)
                                  }}
                                >
                                  <PlayCircle className="h-4 w-4" />
                                  Start Agreement
                                </DropdownMenuItem>
                              )}

                              {vehicle.status === 'running' && vehicle.customer_name && (
                                <>
                                  <DropdownMenuItem
                                    className="text-indigo-600 focus:text-indigo-600"
                                    onClick={() => {
                                      setVehicleToEditAgreement(vehicle)
                                      setShowEditAgreementModal(true)
                                    }}
                                  >
                                    <FileText className="h-4 w-4" />
                                    Edit Agreement
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-teal-600 focus:text-teal-600"
                                    onClick={() => {
                                      setVehicleForInspection(vehicle)
                                      setShowInspectionModal(true)
                                    }}
                                  >
                                    <Camera className="h-4 w-4" />
                                    Inspection
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-purple-600 focus:text-purple-600"
                                    onClick={() => {
                                      setVehicleForInspection(vehicle)
                                      setShowGalleryModal(true)
                                    }}
                                  >
                                    <ListChecks className="h-4 w-4" />
                                    Photos
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-blue-600 focus:text-blue-600"
                                    onClick={() => {
                                      setVehicleForPayment(vehicle)
                                      setShowPaymentModal(true)
                                    }}
                                  >
                                    <CreditCard className="h-4 w-4" />
                                    Renew
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-amber-600 focus:text-amber-600"
                                    onClick={() => {
                                      setVehicleToClose(vehicle)
                                      setShowCloseModal(true)
                                    }}
                                  >
                                    <XCircle className="h-4 w-4" />
                                    Close Agreement
                                  </DropdownMenuItem>
                                </>
                              )}

                              {/* Move - available for idle, available, garage, maintenance */}
                              {!vehicle.customer_name && vehicle.status !== 'returned' && (
                                <DropdownMenuItem
                                  className="text-slate-600 focus:text-slate-600"
                                  onClick={() => {
                                    setVehicleToMove(vehicle)
                                    setShowMoveModal(true)
                                  }}
                                >
                                  <ArrowRightLeft className="h-4 w-4" />
                                  Move
                                </DropdownMenuItem>
                              )}

                              {/* Set Parked Location - for parked (non-rented) active vehicles */}
                              {!vehicle.customer_name && vehicle.status !== 'running' && vehicle.status !== 'returned' && (
                                <DropdownMenuItem
                                  className="text-amber-600 focus:text-amber-600"
                                  onClick={() => {
                                    setVehicleForParkedLocation(vehicle)
                                    setShowParkedLocationModal(true)
                                  }}
                                >
                                  <MapPin className="h-4 w-4" />
                                  {vehicle.parked_location ? 'Update Parked Location' : 'Set Parked Location'}
                                </DropdownMenuItem>
                              )}

                              {/* Mark as Returned - only for leased vehicles that are not running */}
                              {vehicle.ownership_type === 'leased' && vehicle.status !== 'running' && vehicle.status !== 'returned' && vehicle.status !== 'archived' && (
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => handleMarkAsReturned(vehicle)}
                                >
                                  <LogOut className="h-4 w-4" />
                                  Return
  </DropdownMenuItem>
  )}
  {vehicle.status === 'returned' && (
    <DropdownMenuItem variant="destructive" onClick={() => handleRemoveCancelledVehicle(vehicle)}>
      <Archive className="h-4 w-4" />
      Remove returned vehicle
    </DropdownMenuItem>
  )}
  {vehicle.ownership_type === 'owned' && vehicle.status !== 'archived' && vehicle.status !== 'returned' && (
    <DropdownMenuItem variant="destructive" onClick={() => handleRemoveCancelledVehicle(vehicle)}>
      <Archive className="h-4 w-4" />
      Remove owned vehicle
    </DropdownMenuItem>
  )}
  </DropdownMenuContent>
                          </DropdownMenu>

                          {/* Returned badge for returned vehicles */}
                          {vehicle.status === 'returned' && (
                            <Badge variant="secondary" className="bg-rose-100 text-rose-700">
                              <Archive className="h-3 w-3 mr-1" />
                              Inactive
                            </Badge>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Vehicle Details Modal */}
      {selectedVehicle && (
        <VehicleDetailsModal
          vehicle={selectedVehicle}
          open={showModal}
          onOpenChange={setShowModal}
        />
      )}

      {/* Add Vehicle Modal */}
      <AddVehicleModal
        categories={categories}
        open={showAddModal}
        onOpenChange={setShowAddModal}
      />

      {/* Close Agreement Modal */}
      {vehicleToClose && (
        <CloseAgreementModal
          vehicle={vehicleToClose}
          open={showCloseModal}
          onOpenChange={setShowCloseModal}
        />
      )}

      {/* Start Agreement Modal */}
      {vehicleToStart && (
        <StartAgreementModal
          vehicle={vehicleToStart}
          open={showStartModal}
          onOpenChange={setShowStartModal}
        />
      )}

      {/* Edit Agreement Modal */}
      {vehicleToEditAgreement && (
        <StartAgreementModal
          vehicle={vehicleToEditAgreement}
          open={showEditAgreementModal}
          onOpenChange={setShowEditAgreementModal}
          mode="edit"
        />
      )}

      {/* Move Vehicle Modal */}
      {vehicleToMove && (
        <MoveVehicleModal
          vehicle={vehicleToMove}
          open={showMoveModal}
          onOpenChange={setShowMoveModal}
        />
      )}

      {/* Set Parked Location Modal */}
      {vehicleForParkedLocation && (
        <SetParkedLocationModal
          vehicle={vehicleForParkedLocation}
          open={showParkedLocationModal}
          onOpenChange={setShowParkedLocationModal}
        />
      )}

      {/* Inspection Capture Modal */}
      {vehicleForInspection && (
        <InspectionCaptureModal
          vehicle={vehicleForInspection}
          open={showInspectionModal}
          onOpenChange={setShowInspectionModal}
        />
      )}

      {/* Inspection Gallery Modal */}
      {vehicleForInspection && (
        <InspectionGalleryModal
          vehicle={vehicleForInspection}
          open={showGalleryModal}
          onOpenChange={setShowGalleryModal}
          onAddPhotos={() => setShowInspectionModal(true)}
        />
      )}

      {/* Update Payment Modal */}
      {vehicleForPayment && (
        <UpdatePaymentModal
          vehicle={vehicleForPayment}
          open={showPaymentModal}
          onOpenChange={setShowPaymentModal}
        />
      )}

      {/* Bulk Update Modal */}
      {showBulkUpdateModal && (
        <BulkUpdateModal
          vehicles={vehicles}
          open={showBulkUpdateModal}
          onOpenChange={setShowBulkUpdateModal}
        />
      )}
    </div>
  )
}

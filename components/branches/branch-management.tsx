'use client'

import { useState, useMemo } from 'react'
import { Vehicle, VehicleTransfer, Branch, BRANCHES } from '@/lib/types'
import { TransferVehicleModal } from './transfer-vehicle-modal'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Building2,
  Search,
  ArrowRightLeft,
  Car,
  MapPin,
  History,
  ArrowRight,
} from 'lucide-react'
import { format } from 'date-fns'

interface Props {
  vehicles: Vehicle[]
  transfers: VehicleTransfer[]
}

export function BranchManagement({ vehicles, transfers }: Props) {
  const [searchQuery, setSearchQuery] = useState('')
  const [branchFilter, setBranchFilter] = useState<'all' | Branch>('all')
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [vehicleToTransfer, setVehicleToTransfer] = useState<Vehicle | null>(null)

  // Branch statistics
  const stats = useMemo(() => {
    const byBranch: Record<string, number> = {}
    BRANCHES.forEach((b) => {
      byBranch[b] = 0
    })
    let transferred = 0
    vehicles.forEach((v) => {
      if (v.branch && byBranch[v.branch] !== undefined) {
        byBranch[v.branch] += 1
      }
      if ((v.transfer_count ?? 0) > 0) {
        transferred += 1
      }
    })
    return { byBranch, transferred, total: vehicles.length }
  }, [vehicles])

  // Filtered vehicles
  const filteredVehicles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return vehicles.filter((v) => {
      const matchesBranch = branchFilter === 'all' || v.branch === branchFilter
      const matchesSearch =
        !q ||
        v.make?.toLowerCase().includes(q) ||
        v.model?.toLowerCase().includes(q) ||
        v.license_plate?.toLowerCase().includes(q) ||
        v.customer_name?.toLowerCase().includes(q)
      return matchesBranch && matchesSearch
    })
  }, [vehicles, branchFilter, searchQuery])

  const branchColors: Record<string, string> = {
    Muscat: 'bg-blue-100 text-blue-800 border-blue-200',
    Salalah: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  }

  return (
    <div className="space-y-6">
      {/* Dashboard Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Building2 className="h-4 w-4 text-blue-600" />
              Muscat Branch
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.byBranch['Muscat'] ?? 0}</div>
            <p className="text-xs text-muted-foreground">vehicles</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Building2 className="h-4 w-4 text-emerald-600" />
              Salalah Branch
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.byBranch['Salalah'] ?? 0}</div>
            <p className="text-xs text-muted-foreground">vehicles</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <ArrowRightLeft className="h-4 w-4 text-orange-600" />
              Transferred
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.transferred}</div>
            <p className="text-xs text-muted-foreground">vehicles moved at least once</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-slate-400">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Car className="h-4 w-4 text-slate-600" />
              Total Fleet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">vehicles</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search make, model, plate, customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 sm:w-80"
              />
            </div>
            <Select value={branchFilter} onValueChange={(v) => setBranchFilter(v as 'all' | Branch)}>
              <SelectTrigger className="sm:w-44">
                <SelectValue placeholder="Filter by branch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {BRANCHES.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="text-sm text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{filteredVehicles.length}</span> of {vehicles.length}
          </div>
        </CardContent>
      </Card>

      {/* Vehicles Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Car className="h-5 w-5" />
            Vehicles by Branch
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                  <th className="p-3 font-medium">Vehicle</th>
                  <th className="p-3 font-medium">Plate</th>
                  <th className="p-3 font-medium">Branch</th>
                  <th className="p-3 font-medium">Transfers</th>
                  <th className="p-3 font-medium">Customer</th>
                  <th className="p-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredVehicles.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No vehicles found
                    </td>
                  </tr>
                )}
                {filteredVehicles.map((v) => (
                  <tr key={v.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-3">
                      <div className="font-medium">
                        {v.make} {v.model}
                      </div>
                      {v.year && <div className="text-xs text-muted-foreground">{v.year}</div>}
                    </td>
                    <td className="p-3 font-mono text-xs">{v.license_plate}</td>
                    <td className="p-3">
                      <Badge variant="outline" className={branchColors[v.branch] ?? ''}>
                        <MapPin className="mr-1 h-3 w-3" />
                        {v.branch}
                      </Badge>
                    </td>
                    <td className="p-3">
                      {(v.transfer_count ?? 0) > 0 ? (
                        <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700">
                          {v.transfer_count}x
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="p-3">
                      {v.customer_name ? (
                        <span>{v.customer_name}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-blue-600 border-blue-600 hover:bg-blue-50"
                        onClick={() => {
                          setVehicleToTransfer(v)
                          setShowTransferModal(true)
                        }}
                      >
                        <ArrowRightLeft className="mr-1 h-4 w-4" />
                        Transfer
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Transfer History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-5 w-5" />
            Recent Transfers
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                  <th className="p-3 font-medium">Date</th>
                  <th className="p-3 font-medium">Vehicle</th>
                  <th className="p-3 font-medium">Movement</th>
                  <th className="p-3 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {transfers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-muted-foreground">
                      No transfers recorded yet
                    </td>
                  </tr>
                )}
                {transfers.map((t) => (
                  <tr key={t.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-3 whitespace-nowrap text-muted-foreground">
                      {format(new Date(t.transferred_at), 'dd MMM yyyy, HH:mm')}
                    </td>
                    <td className="p-3">
                      {t.vehicle ? (
                        <span className="font-medium">
                          {t.vehicle.make} {t.vehicle.model}{' '}
                          <span className="font-mono text-xs text-muted-foreground">
                            ({t.vehicle.license_plate})
                          </span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Deleted vehicle</span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={branchColors[t.from_branch] ?? ''}>
                          {t.from_branch}
                        </Badge>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <Badge variant="outline" className={branchColors[t.to_branch] ?? ''}>
                          {t.to_branch}
                        </Badge>
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground">{t.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Transfer Modal */}
      {vehicleToTransfer && (
        <TransferVehicleModal
          vehicle={vehicleToTransfer}
          open={showTransferModal}
          onOpenChange={setShowTransferModal}
        />
      )}
    </div>
  )
}

'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import {
  Truck,
  CarFront,
  Users,
  User,
  Plus,
  Search,
  Filter,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  Download,
  FileSpreadsheet,
  KeyRound,
  Wrench,
  X,
  ChevronRight,
  UserCheck,
  UserX,
  Info,
  Phone,
  CreditCard,
  Building2,
  Check
} from 'lucide-react';
import { exportToExcel, exportToCSV } from '@/lib/exportUtils';

interface SummaryData {
  totalVehicles: number;
  activeVehicles: number;
  inactiveVehicles: number;
  maintenanceVehicles: number;
  retiredVehicles: number;
  totalDrivers: number;
  activeDrivers: number;
  licencesExpiringSoon: number;
  expiredCount: number;
  expiringSoonCount: number;
}

export default function FleetManagementPage() {
  const [activeTab, setActiveTab] = useState<'vehicles' | 'drivers' | 'history'>('vehicles');
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<SummaryData>({
    totalVehicles: 0,
    activeVehicles: 0,
    inactiveVehicles: 0,
    maintenanceVehicles: 0,
    retiredVehicles: 0,
    totalDrivers: 0,
    activeDrivers: 0,
    licencesExpiringSoon: 0,
    expiredCount: 0,
    expiringSoonCount: 0,
  });

  // Data lists
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);

  // Filters & Search
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [vehicleStatusFilter, setVehicleStatusFilter] = useState('ALL');
  const [vehicleCategoryFilter, setVehicleCategoryFilter] = useState('ALL');

  const [driverSearch, setDriverSearch] = useState('');
  const [driverStatusFilter, setDriverStatusFilter] = useState('ALL');
  const [driverExpiryFilter, setDriverExpiryFilter] = useState('ALL');

  // Modals & Drawers
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<any | null>(null);
  const [viewingVehicleProfile, setViewingVehicleProfile] = useState<any | null>(null);

  const [isAddDriverOpen, setIsAddDriverOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<any | null>(null);
  const [viewingDriverProfile, setViewingDriverProfile] = useState<any | null>(null);

  const [assigningVehicle, setAssigningVehicle] = useState<any | null>(null);

  // Sensitive Reveal Modal
  const [revealedData, setRevealedData] = useState<{ driverId: string; field: 'PAN' | 'DL'; value: string; driverName: string } | null>(null);
  const [revealingLoading, setRevealingLoading] = useState(false);
  const [revealError, setRevealError] = useState<string | null>(null);

  // Form States
  const [vehicleForm, setVehicleForm] = useState({
    registrationNumber: '',
    carName: '',
    make: '',
    model: '',
    category: 'SEDAN',
    vehicleType: 'Vehicle - 4-Seater',
    seatingCapacity: 4,
    fuelType: 'DIESEL',
    status: 'ACTIVE',
    ownerName: '',
    contactNumber: '',
    notes: '',
    remarks: '',
    initialDriverId: '',
  });

  const [driverForm, setDriverForm] = useState({
    name: '',
    pan: '',
    drivingLicence: '',
    licenceExpiry: '',
    phone: '',
    status: 'ACTIVE',
    remarks: '',
    assignedVehicleId: '',
  });

  const [assignForm, setAssignForm] = useState({
    vehicleId: '',
    driverId: '',
    startDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    fetchSummary();
  }, []);

  useEffect(() => {
    if (activeTab === 'vehicles' || activeTab === 'history') {
      fetchVehicles();
    }
    if (activeTab === 'drivers' || activeTab === 'history') {
      fetchDrivers();
    }
  }, [activeTab, vehicleSearch, vehicleStatusFilter, vehicleCategoryFilter, driverSearch, driverStatusFilter, driverExpiryFilter]);

  const fetchSummary = async () => {
    try {
      const res = await fetch('/api/fleet/summary');
      const data = await res.json();
      if (data.summary) {
        setSummary(data.summary);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      let url = '/api/fleet/vehicles?';
      if (vehicleStatusFilter !== 'ALL') url += `status=${encodeURIComponent(vehicleStatusFilter)}&`;
      if (vehicleCategoryFilter !== 'ALL') url += `category=${encodeURIComponent(vehicleCategoryFilter)}&`;
      if (vehicleSearch) url += `search=${encodeURIComponent(vehicleSearch)}&`;

      const res = await fetch(url);
      const data = await res.json();
      setVehicles(data.vehicles || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      let url = '/api/fleet/drivers?';
      if (driverStatusFilter !== 'ALL') url += `status=${encodeURIComponent(driverStatusFilter)}&`;
      if (driverExpiryFilter !== 'ALL') url += `expiryFilter=${encodeURIComponent(driverExpiryFilter)}&`;
      if (driverSearch) url += `search=${encodeURIComponent(driverSearch)}&`;

      const res = await fetch(url);
      const data = await res.json();
      setDrivers(data.drivers || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Open Full Vehicle Profile
  const handleOpenVehicleProfile = async (vehicleId: string) => {
    try {
      const res = await fetch(`/api/fleet/vehicles/${vehicleId}`);
      const data = await res.json();
      if (data.vehicle) {
        setViewingVehicleProfile(data.vehicle);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Open Full Driver Profile
  const handleOpenDriverProfile = async (driverId: string) => {
    try {
      const res = await fetch(`/api/fleet/drivers/${driverId}`);
      const data = await res.json();
      if (data.driver) {
        setViewingDriverProfile(data.driver);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Reveal sensitive identifier (PAN / DL)
  const handleRevealSensitive = async (driverId: string, field: 'PAN' | 'DL', driverName: string) => {
    setRevealingLoading(true);
    setRevealError(null);
    try {
      const res = await fetch('/api/fleet/reveal-sensitive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverId, field }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRevealError(data.error || 'Failed to reveal identifier');
        return;
      }
      setRevealedData({
        driverId,
        field,
        value: data.value,
        driverName,
      });
    } catch (e: any) {
      setRevealError(e.message || 'Error communicating with server');
    } finally {
      setRevealingLoading(false);
    }
  };

  // Vehicle Submit
  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      const isEdit = !!editingVehicle;
      const url = isEdit ? `/api/fleet/vehicles/${editingVehicle.id}` : '/api/fleet/vehicles';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vehicleForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Failed to save vehicle');
        return;
      }

      setIsAddVehicleOpen(false);
      setEditingVehicle(null);
      fetchVehicles();
      fetchSummary();
    } catch (err: any) {
      setFormError(err.message || 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  // Driver Submit
  const handleSaveDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      const isEdit = !!editingDriver;
      const url = isEdit ? `/api/fleet/drivers/${editingDriver.id}` : '/api/fleet/drivers';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(driverForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Failed to save driver');
        return;
      }

      setIsAddDriverOpen(false);
      setEditingDriver(null);
      fetchDrivers();
      fetchSummary();
    } catch (err: any) {
      setFormError(err.message || 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  // Assignment Submit
  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch('/api/fleet/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assignForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Failed to assign driver');
        return;
      }

      setAssigningVehicle(null);
      fetchVehicles();
      fetchDrivers();
      fetchSummary();
    } catch (err: any) {
      setFormError(err.message || 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete / Soft Delete Vehicle
  const handleDeleteVehicle = async (vehicleId: string, regNo: string) => {
    if (!confirm(`Are you sure you want to deactivate and soft-delete vehicle ${regNo}? It can be restored anytime from the Recycle Bin.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/fleet/vehicles/${vehicleId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchVehicles();
        fetchSummary();
        if (viewingVehicleProfile?.id === vehicleId) setViewingVehicleProfile(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Delete / Soft Delete Driver
  const handleDeleteDriver = async (driverId: string, name: string) => {
    if (!confirm(`Are you sure you want to deactivate and soft-delete driver ${name}? It can be restored anytime from the Recycle Bin.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/fleet/drivers/${driverId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchDrivers();
        fetchSummary();
        if (viewingDriverProfile?.id === driverId) setViewingDriverProfile(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Export Fleet Vehicles
  const handleExportVehicles = () => {
    const exportData = vehicles.map((v) => ({
      'Registration Number': v.registrationNumber,
      'Car Name': v.carName,
      'Make': v.make,
      'Model': v.model,
      'Category': v.category,
      'Seating Capacity': v.seatingCapacity,
      'Fuel Type': v.fuelType,
      'Status': v.status,
      'Assigned Driver': v.currentDriver?.name || 'Unassigned',
      'Driver Phone': v.currentDriver?.phone || '',
      'Driver PAN': v.currentDriver?.panMasked || '',
      'Driving Licence': v.currentDriver?.dlMasked || '',
      'Total Gross Billing (₹)': v.financials?.totalGross || 0,
      'Outstanding Balance (₹)': v.financials?.outstandingBalance || 0,
      'Months in Service': v.financials?.monthsCount || 0,
    }));
    exportToExcel(exportData, 'Fleet Master', 'Atharva_Fleet_Master');
  };

  // Helper status color
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#EAF9EE] text-[#34C759] border border-[#D2F4DA]">Active</span>;
      case 'INACTIVE':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#F2F2F7] text-[#86868B] border border-[#E5E5EA]">Inactive</span>;
      case 'UNDER_MAINTENANCE':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FFF5E5] text-[#FF9F0A] border border-[#FFE4B8]">Maintenance</span>;
      case 'RETIRED':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FEECEB] text-[#FF3B30] border border-[#FCD3D1]">Retired</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#F2F2F7] text-[#86868B]">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto selection:bg-[#B3D7FF] pb-12">
      <Navbar
        title="Fleet Management"
        subtitle="Vehicle Master Database, Driver Registry, Assignments & Fleet Operations"
        onRefresh={() => {
          fetchSummary();
          fetchVehicles();
          fetchDrivers();
        }}
      />

      {/* 2. FLEET DASHBOARD KPI SUMMARY CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total Vehicles */}
        <div className="bg-[#FFFFFF] border border-[#E5E5EA] rounded-[20px] p-4 shadow-apple-card hover:shadow-apple-card-hover transition-all">
          <div className="flex items-center justify-between pb-2">
            <span className="text-[11px] font-medium text-[#86868B]">Total Fleet</span>
            <div className="w-7 h-7 rounded-full bg-[#F2F2F7] flex items-center justify-center text-[#1D1D1F]">
              <Truck className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#1D1D1F] tracking-tight tabular-nums">{summary.totalVehicles}</p>
          <p className="text-[11px] text-[#86868B] mt-1">Registered vehicles</p>
        </div>

        {/* Active Vehicles */}
        <div className="bg-[#FFFFFF] border border-[#E5E5EA] rounded-[20px] p-4 shadow-apple-card hover:shadow-apple-card-hover transition-all">
          <div className="flex items-center justify-between pb-2">
            <span className="text-[11px] font-medium text-[#86868B]">Active Fleet</span>
            <div className="w-7 h-7 rounded-full bg-[#EAF9EE] flex items-center justify-center text-[#34C759]">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#34C759] tracking-tight tabular-nums">{summary.activeVehicles}</p>
          <p className="text-[11px] text-[#86868B] mt-1">On regular duty</p>
        </div>

        {/* Inactive Vehicles */}
        <div className="bg-[#FFFFFF] border border-[#E5E5EA] rounded-[20px] p-4 shadow-apple-card hover:shadow-apple-card-hover transition-all">
          <div className="flex items-center justify-between pb-2">
            <span className="text-[11px] font-medium text-[#86868B]">Inactive</span>
            <div className="w-7 h-7 rounded-full bg-[#F2F2F7] flex items-center justify-center text-[#86868B]">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#86868B] tracking-tight tabular-nums">{summary.inactiveVehicles}</p>
          <p className="text-[11px] text-[#86868B] mt-1">Standby / off-duty</p>
        </div>

        {/* Under Maintenance */}
        <div className="bg-[#FFFFFF] border border-[#E5E5EA] rounded-[20px] p-4 shadow-apple-card hover:shadow-apple-card-hover transition-all">
          <div className="flex items-center justify-between pb-2">
            <span className="text-[11px] font-medium text-[#86868B]">Maintenance</span>
            <div className="w-7 h-7 rounded-full bg-[#FFF5E5] flex items-center justify-center text-[#FF9F0A]">
              <Wrench className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#FF9F0A] tracking-tight tabular-nums">{summary.maintenanceVehicles}</p>
          <p className="text-[11px] text-[#86868B] mt-1">Garage & service</p>
        </div>

        {/* Total Drivers */}
        <div className="bg-[#FFFFFF] border border-[#E5E5EA] rounded-[20px] p-4 shadow-apple-card hover:shadow-apple-card-hover transition-all">
          <div className="flex items-center justify-between pb-2">
            <span className="text-[11px] font-medium text-[#86868B]">Registered Drivers</span>
            <div className="w-7 h-7 rounded-full bg-[#EBF5FF] flex items-center justify-center text-[#007AFF]">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#007AFF] tracking-tight tabular-nums">{summary.totalDrivers}</p>
          <p className="text-[11px] text-[#86868B] mt-1">{summary.activeDrivers} active pilots</p>
        </div>

        {/* Licences Expiring Soon */}
        <div className="bg-[#FFFFFF] border border-[#E5E5EA] rounded-[20px] p-4 shadow-apple-card hover:shadow-apple-card-hover transition-all">
          <div className="flex items-center justify-between pb-2">
            <span className="text-[11px] font-medium text-[#86868B]">Licence Expiry</span>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center ${summary.licencesExpiringSoon > 0 ? 'bg-[#FEECEB] text-[#FF3B30]' : 'bg-[#EAF9EE] text-[#34C759]'}`}>
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className={`text-2xl font-bold tracking-tight tabular-nums ${summary.licencesExpiringSoon > 0 ? 'text-[#FF3B30]' : 'text-[#34C759]'}`}>
            {summary.licencesExpiringSoon}
          </p>
          <p className="text-[11px] text-[#86868B] mt-1">
            {summary.expiredCount > 0 ? `${summary.expiredCount} expired` : 'Within 30 days'}
          </p>
        </div>
      </div>

      {/* NAVIGATION TABS & ACTION BUTTONS */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-[#FFFFFF] border border-[#E5E5EA] p-3 rounded-[22px] shadow-apple-card">
        {/* Apple Segmented Control */}
        <div className="flex items-center bg-[#F2F2F7] p-1 rounded-full w-full md:w-auto">
          <button
            onClick={() => setActiveTab('vehicles')}
            className={`flex-1 md:flex-none px-5 py-1.5 rounded-full text-xs font-semibold transition-all ${
              activeTab === 'vehicles'
                ? 'bg-[#FFFFFF] text-[#1D1D1F] shadow-apple-btn'
                : 'text-[#86868B] hover:text-[#1D1D1F]'
            }`}
          >
            <span className="flex items-center justify-center space-x-1.5">
              <CarFront className="w-3.5 h-3.5" />
              <span>Fleet Vehicles ({summary.totalVehicles})</span>
            </span>
          </button>
          <button
            onClick={() => setActiveTab('drivers')}
            className={`flex-1 md:flex-none px-5 py-1.5 rounded-full text-xs font-semibold transition-all ${
              activeTab === 'drivers'
                ? 'bg-[#FFFFFF] text-[#1D1D1F] shadow-apple-btn'
                : 'text-[#86868B] hover:text-[#1D1D1F]'
            }`}
          >
            <span className="flex items-center justify-center space-x-1.5">
              <Users className="w-3.5 h-3.5" />
              <span>Driver Registry ({summary.totalDrivers})</span>
            </span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2.5 overflow-x-auto">
          {activeTab === 'vehicles' ? (
            <>
              <button
                onClick={handleExportVehicles}
                className="px-4 py-2 rounded-full border border-[#E5E5EA] bg-[#FFFFFF] hover:bg-[#F2F2F7] text-[#1D1D1F] text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-[#86868B]" />
                <span>Export Fleet</span>
              </button>
              <button
                onClick={() => {
                  setVehicleForm({
                    registrationNumber: '',
                    carName: '',
                    make: '',
                    model: '',
                    category: 'SEDAN',
                    vehicleType: 'Vehicle - 4-Seater',
                    seatingCapacity: 4,
                    fuelType: 'DIESEL',
                    status: 'ACTIVE',
                    ownerName: '',
                    contactNumber: '',
                    notes: '',
                    remarks: '',
                    initialDriverId: '',
                  });
                  setEditingVehicle(null);
                  setIsAddVehicleOpen(true);
                }}
                className="px-5 py-2 rounded-full bg-[#007AFF] hover:bg-[#0062CC] text-white text-xs font-semibold flex items-center space-x-1.5 shadow-apple-btn transition-all active:scale-[0.98]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Vehicle</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                setDriverForm({
                  name: '',
                  pan: '',
                  drivingLicence: '',
                  licenceExpiry: '',
                  phone: '',
                  status: 'ACTIVE',
                  remarks: '',
                  assignedVehicleId: '',
                });
                setEditingDriver(null);
                setIsAddDriverOpen(true);
              }}
              className="px-5 py-2 rounded-full bg-[#007AFF] hover:bg-[#0062CC] text-white text-xs font-semibold flex items-center space-x-1.5 shadow-apple-btn transition-all active:scale-[0.98]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Driver</span>
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: FLEET VEHICLES VIEW */}
      {activeTab === 'vehicles' && (
        <div className="space-y-4">
          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#FFFFFF] p-3 rounded-[20px] border border-[#E5E5EA] shadow-apple-card">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#86868B] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by registration number, car name, make, model, or driver..."
                value={vehicleSearch}
                onChange={(e) => setVehicleSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-[#F2F2F7] border-0 rounded-full text-xs text-[#1D1D1F] placeholder-[#86868B] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF] transition-all"
              />
            </div>

            <div className="flex items-center space-x-2">
              <select
                value={vehicleStatusFilter}
                onChange={(e) => setVehicleStatusFilter(e.target.value)}
                className="px-3 py-1.5 bg-[#F2F2F7] border border-[#E5E5EA] rounded-full text-xs font-medium text-[#1D1D1F] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF]"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active Only</option>
                <option value="INACTIVE">Inactive</option>
                <option value="UNDER_MAINTENANCE">Maintenance</option>
                <option value="RETIRED">Retired</option>
              </select>

              <select
                value={vehicleCategoryFilter}
                onChange={(e) => setVehicleCategoryFilter(e.target.value)}
                className="px-3 py-1.5 bg-[#F2F2F7] border border-[#E5E5EA] rounded-full text-xs font-medium text-[#1D1D1F] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF]"
              >
                <option value="ALL">All Categories</option>
                <option value="SEDAN">Sedan</option>
                <option value="SUV">SUV</option>
                <option value="HATCHBACK">Hatchback</option>
                <option value="TEMPO">Tempo Traveller</option>
                <option value="BUS">Bus</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-[#FFFFFF] rounded-[24px] border border-[#E5E5EA] shadow-apple-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-[#F2F2F7] text-[#1D1D1F] font-semibold border-b border-[#E5E5EA]">
                  <tr>
                    <th className="py-3 px-4">Vehicle / Model</th>
                    <th className="py-3 px-4">Registration No</th>
                    <th className="py-3 px-4">Category & Capacity</th>
                    <th className="py-3 px-4">Assigned Driver</th>
                    <th className="py-3 px-4">Driver PAN (Masked)</th>
                    <th className="py-3 px-4">Licence (Masked)</th>
                    <th className="py-3 px-4">Licence Expiry</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5EA]">
                  {loading && vehicles.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-[#86868B]">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#007AFF]" />
                        <span>Loading fleet vehicles...</span>
                      </td>
                    </tr>
                  ) : vehicles.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-[#86868B]">
                        No vehicles found matching the current filter.
                      </td>
                    </tr>
                  ) : (
                    vehicles.map((v) => (
                      <tr key={v.id} className="hover:bg-[#F2F2F7]/50 transition-colors">
                        {/* Vehicle / Model */}
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleOpenVehicleProfile(v.id)}
                            className="text-left group"
                          >
                            <p className="font-semibold text-[#1D1D1F] group-hover:text-[#007AFF] transition-colors flex items-center space-x-1">
                              <span>{v.carName}</span>
                              <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </p>
                            <p className="text-[11px] text-[#86868B]">{v.make} {v.model}</p>
                          </button>
                        </td>

                        {/* Registration Number */}
                        <td className="py-3 px-4">
                          <span className="font-mono font-semibold text-[#1D1D1F] bg-[#F2F2F7] px-2 py-0.5 rounded-md border border-[#E5E5EA]">
                            {v.registrationNumber}
                          </span>
                        </td>

                        {/* Category & Capacity */}
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-1.5">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#EBF5FF] text-[#007AFF]">
                              {v.category || 'SEDAN'}
                            </span>
                            <span className="text-[11px] text-[#86868B]">
                              {v.seatingCapacity} Seater · {v.fuelType}
                            </span>
                          </div>
                        </td>

                        {/* Assigned Driver */}
                        <td className="py-3 px-4">
                          {v.currentDriver ? (
                            <button
                              onClick={() => handleOpenDriverProfile(v.currentDriver.id)}
                              className="text-left group flex items-center space-x-1.5"
                            >
                              <div className="w-5 h-5 rounded-full bg-[#EBF5FF] text-[#007AFF] flex items-center justify-center text-[10px] font-bold">
                                {v.currentDriver.name.charAt(0)}
                              </div>
                              <span className="font-medium text-[#1D1D1F] group-hover:text-[#007AFF]">
                                {v.currentDriver.name}
                              </span>
                            </button>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#FFF5E5] text-[#FF9F0A] border border-[#FFE4B8]">
                              Unassigned
                            </span>
                          )}
                        </td>

                        {/* Driver PAN (Masked) */}
                        <td className="py-3 px-4 font-mono text-xs text-[#86868B]">
                          {v.currentDriver?.panMasked || '—'}
                        </td>

                        {/* Driver DL (Masked) */}
                        <td className="py-3 px-4 font-mono text-xs text-[#86868B]">
                          {v.currentDriver?.dlMasked || '—'}
                        </td>

                        {/* Licence Expiry */}
                        <td className="py-3 px-4">
                          {v.currentDriver?.licenceExpiry ? (
                            <span className="text-[11px] text-[#1D1D1F]">
                              {new Date(v.currentDriver.licenceExpiry).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                          ) : (
                            <span className="text-[11px] text-[#86868B]">—</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4">
                          {getStatusBadge(v.status)}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center space-x-1.5">
                            <button
                              onClick={() => handleOpenVehicleProfile(v.id)}
                              className="p-1.5 text-[#86868B] hover:text-[#007AFF] hover:bg-[#EBF5FF] rounded-full transition-colors"
                              title="View Vehicle Profile & Financials"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => {
                                setAssigningVehicle(v);
                                setAssignForm({
                                  vehicleId: v.id,
                                  driverId: v.currentDriver?.id || '',
                                  startDate: new Date().toISOString().split('T')[0],
                                  notes: '',
                                });
                              }}
                              className="p-1.5 text-[#86868B] hover:text-[#34C759] hover:bg-[#EAF9EE] rounded-full transition-colors"
                              title="Assign / Change Driver"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => {
                                setEditingVehicle(v);
                                setVehicleForm({
                                  registrationNumber: v.registrationNumber,
                                  carName: v.carName || '',
                                  make: v.make || '',
                                  model: v.model || '',
                                  category: v.category || 'SEDAN',
                                  vehicleType: v.vehicleType || 'Vehicle - 4-Seater',
                                  seatingCapacity: v.seatingCapacity || 4,
                                  fuelType: v.fuelType || 'DIESEL',
                                  status: v.status || 'ACTIVE',
                                  ownerName: v.ownerName || '',
                                  contactNumber: v.contactNumber || '',
                                  notes: v.notes || '',
                                  remarks: v.remarks || '',
                                  initialDriverId: '',
                                });
                                setIsAddVehicleOpen(true);
                              }}
                              className="p-1.5 text-[#86868B] hover:text-[#007AFF] hover:bg-[#EBF5FF] rounded-full transition-colors"
                              title="Edit Vehicle"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleDeleteVehicle(v.id, v.registrationNumber)}
                              className="p-1.5 text-[#86868B] hover:text-[#FF3B30] hover:bg-[#FEECEB] rounded-full transition-colors"
                              title="Soft Delete to Recycle Bin"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DRIVER REGISTRY VIEW */}
      {activeTab === 'drivers' && (
        <div className="space-y-4">
          {/* Driver Search & Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#FFFFFF] p-3 rounded-[20px] border border-[#E5E5EA] shadow-apple-card">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#86868B] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by driver name, phone, or remarks..."
                value={driverSearch}
                onChange={(e) => setDriverSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-[#F2F2F7] border-0 rounded-full text-xs text-[#1D1D1F] placeholder-[#86868B] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF] transition-all"
              />
            </div>

            <div className="flex items-center space-x-2">
              <select
                value={driverStatusFilter}
                onChange={(e) => setDriverStatusFilter(e.target.value)}
                className="px-3 py-1.5 bg-[#F2F2F7] border border-[#E5E5EA] rounded-full text-xs font-medium text-[#1D1D1F] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF]"
              >
                <option value="ALL">All Driver Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="ON_LEAVE">On Leave</option>
                <option value="TERMINATED">Terminated</option>
              </select>

              <select
                value={driverExpiryFilter}
                onChange={(e) => setDriverExpiryFilter(e.target.value)}
                className="px-3 py-1.5 bg-[#F2F2F7] border border-[#E5E5EA] rounded-full text-xs font-medium text-[#1D1D1F] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF]"
              >
                <option value="ALL">All Licence Statuses</option>
                <option value="VALID">Valid Licences</option>
                <option value="EXPIRING_SOON">Expiring Soon (&lt; 30d)</option>
                <option value="EXPIRED">Expired</option>
              </select>
            </div>
          </div>

          {/* Drivers Table */}
          <div className="bg-[#FFFFFF] rounded-[24px] border border-[#E5E5EA] shadow-apple-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-[#F2F2F7] text-[#1D1D1F] font-semibold border-b border-[#E5E5EA]">
                  <tr>
                    <th className="py-3 px-4">Driver Name</th>
                    <th className="py-3 px-4">Contact Phone</th>
                    <th className="py-3 px-4">PAN Number (Masked)</th>
                    <th className="py-3 px-4">Driving Licence (Masked)</th>
                    <th className="py-3 px-4">Licence Expiry</th>
                    <th className="py-3 px-4">Assigned Vehicle</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5EA]">
                  {loading && drivers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-[#86868B]">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#007AFF]" />
                        <span>Loading driver registry...</span>
                      </td>
                    </tr>
                  ) : drivers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-[#86868B]">
                        No drivers registered or matching search.
                      </td>
                    </tr>
                  ) : (
                    drivers.map((d) => (
                      <tr key={d.id} className="hover:bg-[#F2F2F7]/50 transition-colors">
                        {/* Name */}
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleOpenDriverProfile(d.id)}
                            className="text-left group flex items-center space-x-2"
                          >
                            <div className="w-7 h-7 rounded-full bg-[#EBF5FF] text-[#007AFF] flex items-center justify-center font-bold text-xs">
                              {d.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-semibold text-[#1D1D1F] group-hover:text-[#007AFF] flex items-center space-x-1">
                                <span>{d.name}</span>
                                <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </p>
                              <p className="text-[11px] text-[#86868B]">ID: {d.id.slice(-6)}</p>
                            </div>
                          </button>
                        </td>

                        {/* Phone */}
                        <td className="py-3 px-4 text-[#1D1D1F]">
                          {d.phone ? (
                            <span className="flex items-center space-x-1 font-mono text-[11px]">
                              <Phone className="w-3 h-3 text-[#86868B]" />
                              <span>{d.phone}</span>
                            </span>
                          ) : (
                            <span className="text-[#86868B]">—</span>
                          )}
                        </td>

                        {/* PAN Masked + Reveal Button */}
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-mono text-xs text-[#1D1D1F] bg-[#F2F2F7] px-2 py-0.5 rounded border border-[#E5E5EA]">
                              {d.panMasked}
                            </span>
                            {d.hasPAN && (
                              <button
                                onClick={() => handleRevealSensitive(d.id, 'PAN', d.name)}
                                className="p-1 text-[#86868B] hover:text-[#007AFF] hover:bg-[#EBF5FF] rounded transition-colors"
                                title="Reveal full PAN (Super Admin / Finance Manager only)"
                              >
                                <KeyRound className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </td>

                        {/* DL Masked + Reveal Button */}
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-mono text-xs text-[#1D1D1F] bg-[#F2F2F7] px-2 py-0.5 rounded border border-[#E5E5EA]">
                              {d.dlMasked}
                            </span>
                            {d.hasDL && (
                              <button
                                onClick={() => handleRevealSensitive(d.id, 'DL', d.name)}
                                className="p-1 text-[#86868B] hover:text-[#007AFF] hover:bg-[#EBF5FF] rounded transition-colors"
                                title="Reveal full DL (Super Admin / Finance Manager only)"
                              >
                                <KeyRound className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Licence Expiry Badge */}
                        <td className="py-3 px-4">
                          {d.licenceExpiry ? (
                            <div className="space-y-0.5">
                              <p className="text-[11px] text-[#1D1D1F] font-mono">
                                {new Date(d.licenceExpiry).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </p>
                              {d.expiryStatus === 'EXPIRED' && (
                                <span className="inline-block px-2 py-0.2 rounded-full text-[10px] font-bold bg-[#FEECEB] text-[#FF3B30] border border-[#FCD3D1]">
                                  EXPIRED
                                </span>
                              )}
                              {d.expiryStatus === 'EXPIRING_SOON' && (
                                <span className="inline-block px-2 py-0.2 rounded-full text-[10px] font-semibold bg-[#FFF5E5] text-[#FF9F0A] border border-[#FFE4B8]">
                                  {d.daysRemaining} days left
                                </span>
                              )}
                              {d.expiryStatus === 'VALID' && (
                                <span className="inline-block px-2 py-0.2 rounded-full text-[10px] font-medium bg-[#EAF9EE] text-[#34C759]">
                                  Valid
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[#86868B]">—</span>
                          )}
                        </td>

                        {/* Assigned Vehicle */}
                        <td className="py-3 px-4">
                          {d.currentVehicle ? (
                            <button
                              onClick={() => handleOpenVehicleProfile(d.currentVehicle.id)}
                              className="text-left group flex items-center space-x-1.5"
                            >
                              <span className="font-mono font-semibold text-xs text-[#007AFF] group-hover:underline">
                                {d.currentVehicle.registrationNumber}
                              </span>
                              <span className="text-[11px] text-[#86868B]">
                                ({d.currentVehicle.carName})
                              </span>
                            </button>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#F2F2F7] text-[#86868B]">
                              Not Assigned
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4">
                          {getStatusBadge(d.status)}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center space-x-1.5">
                            <button
                              onClick={() => handleOpenDriverProfile(d.id)}
                              className="p-1.5 text-[#86868B] hover:text-[#007AFF] hover:bg-[#EBF5FF] rounded-full transition-colors"
                              title="View Driver Profile"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => {
                                setEditingDriver(d);
                                setDriverForm({
                                  name: d.name,
                                  pan: '',
                                  drivingLicence: '',
                                  licenceExpiry: d.licenceExpiry ? new Date(d.licenceExpiry).toISOString().split('T')[0] : '',
                                  phone: d.phone || '',
                                  status: d.status || 'ACTIVE',
                                  remarks: d.remarks || '',
                                  assignedVehicleId: '',
                                });
                                setIsAddDriverOpen(true);
                              }}
                              className="p-1.5 text-[#86868B] hover:text-[#007AFF] hover:bg-[#EBF5FF] rounded-full transition-colors"
                              title="Edit Driver Details"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleDeleteDriver(d.id, d.name)}
                              className="p-1.5 text-[#86868B] hover:text-[#FF3B30] hover:bg-[#FEECEB] rounded-full transition-colors"
                              title="Soft Delete to Recycle Bin"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SENSITIVE IDENTIFIER REVEAL MODAL */}
      {revealedData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-[#FFFFFF] rounded-[24px] max-w-md w-full p-6 shadow-2xl border border-[#E5E5EA] space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5E5EA]">
              <div className="flex items-center space-x-2 text-[#007AFF]">
                <Shield className="w-5 h-5" />
                <h3 className="font-bold text-sm text-[#1D1D1F]">Authorized Sensitive Information</h3>
              </div>
              <button
                onClick={() => setRevealedData(null)}
                className="w-7 h-7 rounded-full bg-[#F2F2F7] flex items-center justify-center text-[#86868B] hover:text-[#1D1D1F]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-[#FFF5E5] border border-[#FFE4B8] p-3 rounded-[16px] text-xs text-[#FF9F0A] flex items-center space-x-2">
              <Info className="w-4 h-4 shrink-0" />
              <span>
                Access logged to system audit. Do not photograph or export unmasked personal identifiers.
              </span>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs text-[#86868B]">Driver</p>
              <p className="text-sm font-semibold text-[#1D1D1F]">{revealedData.driverName}</p>
            </div>

            <div className="space-y-1.5 bg-[#F2F2F7] p-4 rounded-[18px] border border-[#E5E5EA]">
              <p className="text-xs text-[#86868B] font-medium">
                {revealedData.field === 'PAN' ? 'Permanent Account Number (PAN)' : 'Driving Licence Number'}
              </p>
              <div className="flex items-center justify-between pt-1">
                <span className="font-mono text-xl font-bold tracking-wider text-[#1D1D1F] select-all">
                  {revealedData.value}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(revealedData.value);
                    alert('Copied to clipboard!');
                  }}
                  className="px-3 py-1 rounded-full text-xs font-semibold bg-[#FFFFFF] border border-[#E5E5EA] text-[#007AFF] hover:bg-[#F2F2F7]"
                >
                  Copy
                </button>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setRevealedData(null)}
                className="px-5 py-2 rounded-full text-xs font-semibold bg-[#1D1D1F] text-white hover:bg-[#333336] transition-colors"
              >
                Close & Mask
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REVEAL ERROR ALERT */}
      {revealError && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#FEECEB] border border-[#FCD3D1] text-[#FF3B30] p-4 rounded-[18px] shadow-lg flex items-center space-x-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <p className="text-xs font-medium">{revealError}</p>
          <button onClick={() => setRevealError(null)} className="text-[#FF3B30] hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ASSIGN DRIVER QUICK MODAL */}
      {assigningVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-[#FFFFFF] rounded-[24px] max-w-md w-full p-6 shadow-2xl border border-[#E5E5EA] space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5E5EA]">
              <div>
                <h3 className="font-bold text-sm text-[#1D1D1F]">Assign / Change Driver</h3>
                <p className="text-xs text-[#86868B]">{assigningVehicle.registrationNumber} ({assigningVehicle.carName})</p>
              </div>
              <button
                onClick={() => setAssigningVehicle(null)}
                className="w-7 h-7 rounded-full bg-[#F2F2F7] flex items-center justify-center text-[#86868B] hover:text-[#1D1D1F]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-[16px] bg-[#FEECEB] border border-[#FCD3D1] text-xs text-[#FF3B30]">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveAssignment} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#86868B] mb-1">Select Driver</label>
                <select
                  value={assignForm.driverId}
                  onChange={(e) => setAssignForm({ ...assignForm, driverId: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-xs text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF]"
                >
                  <option value="">-- Choose Driver --</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} {d.phone ? `(${d.phone})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#86868B] mb-1">Assignment Start Date</label>
                <input
                  type="date"
                  value={assignForm.startDate}
                  onChange={(e) => setAssignForm({ ...assignForm, startDate: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-xs text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#86868B] mb-1">Notes / Reason for Assignment</label>
                <textarea
                  value={assignForm.notes}
                  onChange={(e) => setAssignForm({ ...assignForm, notes: e.target.value })}
                  placeholder="Optional assignment remarks..."
                  rows={2}
                  className="w-full px-3 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-xs text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF]"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAssigningVehicle(null)}
                  className="px-4 py-2 rounded-full text-xs font-medium bg-[#F2F2F7] text-[#1D1D1F] hover:bg-[#E5E5EA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-full text-xs font-semibold bg-[#007AFF] text-white hover:bg-[#0062CC] shadow-apple-btn disabled:opacity-50"
                >
                  {submitting ? 'Assigning...' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD / EDIT VEHICLE MODAL */}
      {isAddVehicleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-[#FFFFFF] rounded-[24px] max-w-xl w-full p-6 shadow-2xl border border-[#E5E5EA] space-y-4 my-8">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5E5EA]">
              <div>
                <h3 className="font-bold text-sm text-[#1D1D1F]">
                  {editingVehicle ? 'Edit Vehicle Master' : 'Add New Fleet Vehicle'}
                </h3>
                <p className="text-xs text-[#86868B]">
                  {editingVehicle ? 'Update fleet specifications and status' : 'Register a new commercial fleet vehicle'}
                </p>
              </div>
              <button
                onClick={() => {
                  setIsAddVehicleOpen(false);
                  setEditingVehicle(null);
                }}
                className="w-7 h-7 rounded-full bg-[#F2F2F7] flex items-center justify-center text-[#86868B] hover:text-[#1D1D1F]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-[16px] bg-[#FEECEB] border border-[#FCD3D1] text-xs text-[#FF3B30]">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveVehicle} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#86868B] mb-1">
                    Registration Number <span className="text-[#FF3B30]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. KA04D1234"
                    value={vehicleForm.registrationNumber}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, registrationNumber: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-xs font-mono uppercase text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#86868B] mb-1">Car Display Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Innova Crysta #1"
                    value={vehicleForm.carName}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, carName: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-xs text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#86868B] mb-1">Make / Manufacturer</label>
                  <input
                    type="text"
                    placeholder="e.g. Toyota, Maruti Suzuki, Force"
                    value={vehicleForm.make}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, make: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-xs text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#86868B] mb-1">Model</label>
                  <input
                    type="text"
                    placeholder="e.g. Innova, Dzire, Ertiga"
                    value={vehicleForm.model}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-xs text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#86868B] mb-1">Vehicle Category</label>
                  <select
                    value={vehicleForm.category}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, category: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-xs text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF]"
                  >
                    <option value="SEDAN">Sedan (4 Seater)</option>
                    <option value="SUV">SUV (6-7 Seater)</option>
                    <option value="HATCHBACK">Hatchback (4 Seater)</option>
                    <option value="TEMPO">Tempo Traveller (12-17 Seater)</option>
                    <option value="BUS">Bus / Coach (20+ Seater)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#86868B] mb-1">Seating Capacity</label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={vehicleForm.seatingCapacity}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, seatingCapacity: parseInt(e.target.value) || 4 })}
                    className="w-full px-3 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-xs text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#86868B] mb-1">Fuel Type</label>
                  <select
                    value={vehicleForm.fuelType}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, fuelType: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-xs text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF]"
                  >
                    <option value="DIESEL">Diesel</option>
                    <option value="PETROL">Petrol</option>
                    <option value="CNG">CNG</option>
                    <option value="ELECTRIC">Electric (EV)</option>
                    <option value="HYBRID">Hybrid</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#86868B] mb-1">Vehicle Status</label>
                  <select
                    value={vehicleForm.status}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, status: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-xs text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF]"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="UNDER_MAINTENANCE">Under Maintenance</option>
                    <option value="RETIRED">Retired</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#86868B] mb-1">Owner Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Atharva Travels / Vendor"
                    value={vehicleForm.ownerName}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, ownerName: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-xs text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#86868B] mb-1">Owner Contact Phone</label>
                  <input
                    type="text"
                    placeholder="e.g. +91 98765 43210"
                    value={vehicleForm.contactNumber}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, contactNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-xs text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF]"
                  />
                </div>
              </div>

              {!editingVehicle && (
                <div>
                  <label className="block text-xs font-medium text-[#86868B] mb-1">Assign Initial Driver (Optional)</label>
                  <select
                    value={vehicleForm.initialDriverId}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, initialDriverId: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-xs text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF]"
                  >
                    <option value="">-- No Driver Assigned Initially --</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} {d.phone ? `(${d.phone})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-[#86868B] mb-1">Notes & Remarks</label>
                <textarea
                  rows={2}
                  placeholder="Additional notes about permits, insurance, GPS, etc."
                  value={vehicleForm.notes}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-xs text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF]"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#E5E5EA]">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddVehicleOpen(false);
                    setEditingVehicle(null);
                  }}
                  className="px-4 py-2 rounded-full text-xs font-medium bg-[#F2F2F7] text-[#1D1D1F] hover:bg-[#E5E5EA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-full text-xs font-semibold bg-[#007AFF] text-white hover:bg-[#0062CC] shadow-apple-btn disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingVehicle ? 'Update Vehicle' : 'Register Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD / EDIT DRIVER MODAL */}
      {isAddDriverOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-[#FFFFFF] rounded-[24px] max-w-xl w-full p-6 shadow-2xl border border-[#E5E5EA] space-y-4 my-8">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5E5EA]">
              <div>
                <h3 className="font-bold text-sm text-[#1D1D1F]">
                  {editingDriver ? 'Edit Driver Profile' : 'Register New Driver'}
                </h3>
                <p className="text-xs text-[#86868B]">
                  Personal identifiers (PAN and DL) are encrypted at rest with field-level AES-256
                </p>
              </div>
              <button
                onClick={() => {
                  setIsAddDriverOpen(false);
                  setEditingDriver(null);
                }}
                className="w-7 h-7 rounded-full bg-[#F2F2F7] flex items-center justify-center text-[#86868B] hover:text-[#1D1D1F]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-[16px] bg-[#FEECEB] border border-[#FCD3D1] text-xs text-[#FF3B30]">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveDriver} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-[#86868B] mb-1">
                  Full Driver Name <span className="text-[#FF3B30]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={driverForm.name}
                  onChange={(e) => setDriverForm({ ...driverForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-xs text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#86868B] mb-1">
                    PAN Number (Encrypted)
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    placeholder={editingDriver ? 'Leave blank to keep current' : 'e.g. ABCDE1234F'}
                    value={driverForm.pan}
                    onChange={(e) => setDriverForm({ ...driverForm, pan: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-xs font-mono uppercase text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF]"
                  />
                  <span className="text-[10px] text-[#86868B] mt-0.5 block">Format: 5 letters, 4 digits, 1 letter</span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#86868B] mb-1">
                    Driving Licence Number (Encrypted)
                  </label>
                  <input
                    type="text"
                    maxLength={16}
                    placeholder={editingDriver ? 'Leave blank to keep current' : 'e.g. KA0420190012345'}
                    value={driverForm.drivingLicence}
                    onChange={(e) => setDriverForm({ ...driverForm, drivingLicence: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-xs font-mono uppercase text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF]"
                  />
                  <span className="text-[10px] text-[#86868B] mt-0.5 block">Standard Indian DL format</span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#86868B] mb-1">
                    Licence Expiry Date
                  </label>
                  <input
                    type="date"
                    value={driverForm.licenceExpiry}
                    onChange={(e) => setDriverForm({ ...driverForm, licenceExpiry: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-xs text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#86868B] mb-1">Contact Phone</label>
                  <input
                    type="text"
                    placeholder="e.g. +91 98765 43210"
                    value={driverForm.phone}
                    onChange={(e) => setDriverForm({ ...driverForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-xs text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#86868B] mb-1">Driver Status</label>
                  <select
                    value={driverForm.status}
                    onChange={(e) => setDriverForm({ ...driverForm, status: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-xs text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF]"
                  >
                    <option value="ACTIVE">Active Pilot</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="ON_LEAVE">On Leave</option>
                    <option value="TERMINATED">Terminated</option>
                  </select>
                </div>

                {!editingDriver && (
                  <div>
                    <label className="block text-xs font-medium text-[#86868B] mb-1">Assign to Vehicle</label>
                    <select
                      value={driverForm.assignedVehicleId}
                      onChange={(e) => setDriverForm({ ...driverForm, assignedVehicleId: e.target.value })}
                      className="w-full px-3 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-xs text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF]"
                    >
                      <option value="">-- No Vehicle Assigned Initially --</option>
                      {vehicles.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.registrationNumber} ({v.carName})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-[#86868B] mb-1">Remarks</label>
                <textarea
                  rows={2}
                  placeholder="Medical notes, badge number, special endorsements..."
                  value={driverForm.remarks}
                  onChange={(e) => setDriverForm({ ...driverForm, remarks: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-xs text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF]"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#E5E5EA]">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddDriverOpen(false);
                    setEditingDriver(null);
                  }}
                  className="px-4 py-2 rounded-full text-xs font-medium bg-[#F2F2F7] text-[#1D1D1F] hover:bg-[#E5E5EA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-full text-xs font-semibold bg-[#007AFF] text-white hover:bg-[#0062CC] shadow-apple-btn disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingDriver ? 'Update Driver' : 'Save Driver'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VEHICLE PROFILE DRAWER / MODAL (Requirement 6) */}
      {viewingVehicleProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-[#FFFFFF] rounded-[24px] max-w-3xl w-full p-6 shadow-2xl border border-[#E5E5EA] space-y-6 my-8 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5EA]">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-[#F2F2F7] flex items-center justify-center text-[#1D1D1F]">
                  <CarFront className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold text-base text-[#1D1D1F]">{viewingVehicleProfile.carName}</h3>
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-[#F2F2F7] border border-[#E5E5EA]">
                      {viewingVehicleProfile.registrationNumber}
                    </span>
                    {getStatusBadge(viewingVehicleProfile.status)}
                  </div>
                  <p className="text-xs text-[#86868B]">{viewingVehicleProfile.make} {viewingVehicleProfile.model} · {viewingVehicleProfile.category} ({viewingVehicleProfile.seatingCapacity} Seater)</p>
                </div>
              </div>
              <button
                onClick={() => setViewingVehicleProfile(null)}
                className="w-7 h-7 rounded-full bg-[#F2F2F7] flex items-center justify-center text-[#86868B] hover:text-[#1D1D1F]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current Driver Card */}
            <div className="bg-[#F2F2F7]/60 border border-[#E5E5EA] p-4 rounded-[20px] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#86868B] uppercase tracking-wider">Current Assigned Driver</span>
                <button
                  onClick={() => {
                    setAssigningVehicle(viewingVehicleProfile);
                    setAssignForm({
                      vehicleId: viewingVehicleProfile.id,
                      driverId: viewingVehicleProfile.currentDriver?.id || '',
                      startDate: new Date().toISOString().split('T')[0],
                      notes: '',
                    });
                  }}
                  className="px-3 py-1 rounded-full text-xs font-semibold bg-[#FFFFFF] border border-[#E5E5EA] text-[#007AFF] hover:bg-[#F2F2F7] shadow-2xs"
                >
                  Change Driver
                </button>
              </div>
              {viewingVehicleProfile.currentDriver ? (
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-full bg-[#EBF5FF] text-[#007AFF] font-bold flex items-center justify-center text-sm">
                      {viewingVehicleProfile.currentDriver.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-[#1D1D1F]">{viewingVehicleProfile.currentDriver.name}</p>
                      <p className="text-xs text-[#86868B]">{viewingVehicleProfile.currentDriver.phone || 'No phone'}</p>
                    </div>
                  </div>
                  <div className="text-right font-mono text-xs space-y-0.5">
                    <p className="text-[#86868B]">PAN: <span className="text-[#1D1D1F]">{viewingVehicleProfile.currentDriver.panMasked || '—'}</span></p>
                    <p className="text-[#86868B]">DL: <span className="text-[#1D1D1F]">{viewingVehicleProfile.currentDriver.dlMasked || '—'}</span></p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[#FF9F0A] font-medium pt-1">No driver assigned to this vehicle currently.</p>
              )}
            </div>

            {/* Linked Companies Breakdown */}
            {viewingVehicleProfile.linkedCompanies && viewingVehicleProfile.linkedCompanies.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-[#86868B] uppercase tracking-wider">Linked Client / Company Breakdown</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {viewingVehicleProfile.linkedCompanies.map((c: any, idx: number) => (
                    <div key={idx} className="bg-[#FFFFFF] border border-[#E5E5EA] p-3 rounded-[16px] space-y-1">
                      <p className="font-semibold text-xs text-[#1D1D1F] truncate">{c.companyName}</p>
                      <p className="text-sm font-bold text-[#007AFF] tabular-nums">
                        ₹{c.totalBilling.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-[10px] text-[#86868B]">{c.tripCount} trips / KMs logged</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Assignment History Timeline */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-[#86868B] uppercase tracking-wider">Driver Assignment History</h4>
              <div className="border border-[#E5E5EA] rounded-[18px] overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#F2F2F7] text-[#86868B]">
                    <tr>
                      <th className="py-2.5 px-3">Driver Name</th>
                      <th className="py-2.5 px-3">Start Date</th>
                      <th className="py-2.5 px-3">End Date</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Assigned By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E5EA]">
                    {viewingVehicleProfile.assignmentHistory && viewingVehicleProfile.assignmentHistory.length > 0 ? (
                      viewingVehicleProfile.assignmentHistory.map((ah: any) => (
                        <tr key={ah.id} className="hover:bg-[#F2F2F7]/40">
                          <td className="py-2.5 px-3 font-semibold text-[#1D1D1F]">{ah.driverName}</td>
                          <td className="py-2.5 px-3 font-mono text-[11px]">{new Date(ah.startDate).toLocaleDateString('en-IN')}</td>
                          <td className="py-2.5 px-3 font-mono text-[11px]">{ah.endDate ? new Date(ah.endDate).toLocaleDateString('en-IN') : '—'}</td>
                          <td className="py-2.5 px-3">
                            {ah.isCurrent ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#EAF9EE] text-[#34C759]">Active</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#F2F2F7] text-[#86868B]">Ended</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-[11px] text-[#86868B]">{ah.assignedBy || 'System'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-[#86868B]">No assignment history recorded.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Linked Monthly Finance Records */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-[#86868B] uppercase tracking-wider">Related Monthly Financial Records</h4>
              <div className="border border-[#E5E5EA] rounded-[18px] overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#F2F2F7] text-[#86868B]">
                    <tr>
                      <th className="py-2.5 px-3">Period</th>
                      <th className="py-2.5 px-3">Gross Billing</th>
                      <th className="py-2.5 px-3">Deductions</th>
                      <th className="py-2.5 px-3">Net Payable</th>
                      <th className="py-2.5 px-3">Paid Amount</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E5EA]">
                    {viewingVehicleProfile.financialHistory && viewingVehicleProfile.financialHistory.length > 0 ? (
                      viewingVehicleProfile.financialHistory.map((fh: any) => (
                        <tr key={fh.recordId} className="hover:bg-[#F2F2F7]/40">
                          <td className="py-2.5 px-3 font-semibold text-[#1D1D1F]">{fh.periodName}</td>
                          <td className="py-2.5 px-3 tabular-nums font-mono">₹{fh.grossBilling.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td className="py-2.5 px-3 tabular-nums font-mono text-[#FF3B30]">-₹{fh.totalDeductions.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td className="py-2.5 px-3 tabular-nums font-mono font-semibold">₹{fh.netPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td className="py-2.5 px-3 tabular-nums font-mono text-[#34C759]">₹{fh.amountPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#EBF5FF] text-[#007AFF]">
                              {fh.paymentStatus}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-4 text-center text-[#86868B]">No monthly billing records linked yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DRIVER PROFILE DRAWER / MODAL (Requirement 6) */}
      {viewingDriverProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-[#FFFFFF] rounded-[24px] max-w-2xl w-full p-6 shadow-2xl border border-[#E5E5EA] space-y-6 my-8 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5EA]">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-full bg-[#EBF5FF] text-[#007AFF] font-bold flex items-center justify-center text-lg shadow-xs">
                  {viewingDriverProfile.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold text-base text-[#1D1D1F]">{viewingDriverProfile.name}</h3>
                    {getStatusBadge(viewingDriverProfile.status)}
                  </div>
                  <p className="text-xs text-[#86868B]">{viewingDriverProfile.phone || 'No phone recorded'}</p>
                </div>
              </div>
              <button
                onClick={() => setViewingDriverProfile(null)}
                className="w-7 h-7 rounded-full bg-[#F2F2F7] flex items-center justify-center text-[#86868B] hover:text-[#1D1D1F]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sensitive Identifiers Card */}
            <div className="bg-[#F2F2F7]/70 border border-[#E5E5EA] p-4 rounded-[20px] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#86868B] uppercase tracking-wider flex items-center space-x-1.5">
                  <Shield className="w-3.5 h-3.5 text-[#007AFF]" />
                  <span>Personal Identifiers (Encrypted At Rest)</span>
                </span>
                <span className="text-[10px] text-[#86868B]">AES-256 Protected</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="bg-[#FFFFFF] border border-[#E5E5EA] p-3 rounded-[16px] space-y-1">
                  <p className="text-[11px] text-[#86868B]">PAN Number</p>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-semibold text-[#1D1D1F]">
                      {viewingDriverProfile.panMasked}
                    </span>
                    {viewingDriverProfile.hasPAN && (
                      <button
                        onClick={() => handleRevealSensitive(viewingDriverProfile.id, 'PAN', viewingDriverProfile.name)}
                        className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#EBF5FF] text-[#007AFF] hover:bg-[#D9ECFF] flex items-center space-x-1"
                      >
                        <KeyRound className="w-3 h-3" />
                        <span>Reveal</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="bg-[#FFFFFF] border border-[#E5E5EA] p-3 rounded-[16px] space-y-1">
                  <p className="text-[11px] text-[#86868B]">Driving Licence</p>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-semibold text-[#1D1D1F]">
                      {viewingDriverProfile.dlMasked}
                    </span>
                    {viewingDriverProfile.hasDL && (
                      <button
                        onClick={() => handleRevealSensitive(viewingDriverProfile.id, 'DL', viewingDriverProfile.name)}
                        className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#EBF5FF] text-[#007AFF] hover:bg-[#D9ECFF] flex items-center space-x-1"
                      >
                        <KeyRound className="w-3 h-3" />
                        <span>Reveal</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Expiry Status */}
              <div className="bg-[#FFFFFF] border border-[#E5E5EA] p-3 rounded-[16px] flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-[#86868B]">Licence Expiry Date</p>
                  <p className="text-xs font-semibold text-[#1D1D1F]">
                    {viewingDriverProfile.licenceExpiry
                      ? new Date(viewingDriverProfile.licenceExpiry).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                        })
                      : 'Not recorded'}
                  </p>
                </div>
                {viewingDriverProfile.expiryStatus === 'EXPIRED' && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#FEECEB] text-[#FF3B30] border border-[#FCD3D1]">
                    EXPIRED
                  </span>
                )}
                {viewingDriverProfile.expiryStatus === 'EXPIRING_SOON' && (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#FFF5E5] text-[#FF9F0A] border border-[#FFE4B8]">
                    Expiring in {viewingDriverProfile.daysRemaining} days
                  </span>
                )}
                {viewingDriverProfile.expiryStatus === 'VALID' && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#EAF9EE] text-[#34C759]">
                    Valid Licence
                  </span>
                )}
              </div>
            </div>

            {/* Current Vehicle */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-[#86868B] uppercase tracking-wider">Currently Assigned Vehicle</h4>
              {viewingDriverProfile.currentVehicle ? (
                <div className="bg-[#FFFFFF] border border-[#E5E5EA] p-4 rounded-[20px] flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-[#F2F2F7] flex items-center justify-center text-[#1D1D1F]">
                      <CarFront className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-[#1D1D1F]">{viewingDriverProfile.currentVehicle.carName}</p>
                      <p className="font-mono text-xs text-[#007AFF]">{viewingDriverProfile.currentVehicle.registrationNumber}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setViewingDriverProfile(null);
                      handleOpenVehicleProfile(viewingDriverProfile.currentVehicle.id);
                    }}
                    className="px-3 py-1.5 rounded-full text-xs font-medium bg-[#F2F2F7] hover:bg-[#E5E5EA] text-[#1D1D1F] flex items-center space-x-1"
                  >
                    <span>View Vehicle</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <p className="text-xs text-[#86868B] bg-[#F2F2F7] p-3 rounded-[16px]">This driver is not currently assigned to any active vehicle.</p>
              )}
            </div>

            {/* Past Vehicle Assignments History */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-[#86868B] uppercase tracking-wider">Past Vehicle Assignments</h4>
              <div className="border border-[#E5E5EA] rounded-[18px] overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#F2F2F7] text-[#86868B]">
                    <tr>
                      <th className="py-2.5 px-3">Vehicle</th>
                      <th className="py-2.5 px-3">Start Date</th>
                      <th className="py-2.5 px-3">End Date</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E5EA]">
                    {viewingDriverProfile.assignmentHistory && viewingDriverProfile.assignmentHistory.length > 0 ? (
                      viewingDriverProfile.assignmentHistory.map((ah: any) => (
                        <tr key={ah.id} className="hover:bg-[#F2F2F7]/40">
                          <td className="py-2.5 px-3 font-semibold text-[#1D1D1F]">
                            {ah.registrationNumber} ({ah.carName})
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px]">{new Date(ah.startDate).toLocaleDateString('en-IN')}</td>
                          <td className="py-2.5 px-3 font-mono text-[11px]">{ah.endDate ? new Date(ah.endDate).toLocaleDateString('en-IN') : '—'}</td>
                          <td className="py-2.5 px-3">
                            {ah.isCurrent ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#EAF9EE] text-[#34C759]">Active</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#F2F2F7] text-[#86868B]">Ended</span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-[#86868B]">No past assignments recorded.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


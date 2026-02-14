// frontend/app/dashboard/inventory/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { workspaces, inventory, api } from '@/lib/api';
import { useSearchParams } from 'next/navigation';

interface Service {
  id: string;
  name: string;
  color: string;
}

interface InventoryItem {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  quantity: number;
  low_stock_threshold: number;
  unit: string;
  vendor_email?: string;
  linked_service_ids?: string[];
  created_at: string;
  updated_at: string;
}

export default function InventoryDashboard() {
  const searchParams = useSearchParams();
  const highlightedItemId = searchParams.get('item');
  const itemRefs = useRef<{[key: string]: HTMLDivElement | null}>({});
  const [workspace, setWorkspace] = useState<any>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [allItems, setAllItems] = useState<InventoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [selectedServiceFilter, setSelectedServiceFilter] = useState<string>('all');
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUsageModal, setShowUsageModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // States
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form states with default factory functions
  const defaultNewItem = () => ({
    name: '',
    description: '',
    quantity: 0,
    low_stock_threshold: 10,
    unit: 'pieces',
    vendor_email: '',
    linked_service_ids: [] as string[]
  });

  const defaultUsageData = () => ({
    quantity_used: 0,
    notes: ''
  });

  const defaultEditData = () => ({
    quantity: 0,
    low_stock_threshold: 10,
    linked_service_ids: [] as string[]
  });

  const [newItem, setNewItem] = useState(defaultNewItem());
  const [usageData, setUsageData] = useState(defaultUsageData());
  const [editData, setEditData] = useState(defaultEditData());

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterItems();
  }, [allItems, selectedServiceFilter]);

  useEffect(() => {
    if (highlightedItemId && filteredItems.length > 0 && itemRefs.current[highlightedItemId]) {
      // Wait for render
      setTimeout(() => {
        const element = itemRefs.current[highlightedItemId];
        if (element) {
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
          
          // Add highlight animation
          element.classList.add('ring-4', 'ring-blue-400', 'ring-offset-2');
          
          // Remove highlight after 3 seconds
          setTimeout(() => {
            element.classList.remove('ring-4', 'ring-blue-400', 'ring-offset-2');
          }, 3000);
        }
      }, 300);
    }
  }, [highlightedItemId, filteredItems]);

  const loadData = async () => {
    try {
      const wsList = await workspaces.list();
      if (!wsList.length) return;
      const ws = wsList[0];
      setWorkspace(ws);
      
      const servicesData = await api.get(`/api/workspaces/${ws.id}/services`);
      setServices(servicesData.data);
      
      const data = await inventory.list(ws.id);
      setAllItems(data);
    } catch (err) {
      setError('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const filterItems = () => {
    if (selectedServiceFilter === 'all') {
      setFilteredItems(allItems);
    } else if (selectedServiceFilter === 'shared') {
      setFilteredItems(allItems.filter(item => 
        !item.linked_service_ids || item.linked_service_ids.length === 0
      ));
    } else {
      setFilteredItems(allItems.filter(item => 
        !item.linked_service_ids || 
        item.linked_service_ids.length === 0 || 
        item.linked_service_ids.includes(selectedServiceFilter)
      ));
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace) return;
    setSaving(true);
    setError('');
    
    try {
      const itemData = {
        name: newItem.name,
        description: newItem.description || null,
        quantity: newItem.quantity,
        low_stock_threshold: newItem.low_stock_threshold,
        unit: newItem.unit || 'pieces',
        vendor_email: newItem.vendor_email || null,
        linked_service_ids: newItem.linked_service_ids
      };
      
      // 🔍 DEBUG LOGS
      console.log('='.repeat(60));
      console.log('📤 SENDING TO BACKEND:');
      console.log(JSON.stringify(itemData, null, 2));
      console.log('='.repeat(60));
      
      const created = await inventory.create(workspace.id, itemData);
      
      console.log('='.repeat(60));
      console.log('📥 RECEIVED FROM BACKEND:');
      console.log(JSON.stringify(created, null, 2));
      console.log('='.repeat(60));
      
      setAllItems([...allItems, created]);
      setNewItem(defaultNewItem());
      setShowAddModal(false);
      setSuccessMsg('Item added successfully');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      console.error('❌ ERROR:', err.response?.data);
      setError(err.response?.data?.detail || 'Failed to add item');
    } finally {
      setSaving(false);
    }
  };

  const handleRecordUsage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    setSaving(true);
    setError('');
    try {
      await inventory.recordUsage(selectedItem.id, usageData);
      setAllItems(allItems.map(item => 
        item.id === selectedItem.id 
          ? { ...item, quantity: item.quantity - usageData.quantity_used }
          : item
      ));
      setUsageData(defaultUsageData());
      setShowUsageModal(false);
      setSelectedItem(null);
      setSuccessMsg('Usage recorded successfully');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError('Failed to record usage');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateItem = async (itemId: string) => {
    setSaving(true);
    setError('');
    try {
      const updated = await inventory.update(itemId, editData);
      setAllItems(allItems.map(item => item.id === itemId ? updated : item));
      setEditingId(null);
      setSuccessMsg('Item updated successfully');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError('Failed to update item');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (item: InventoryItem) => {
    setEditingId(item.id);
    setEditData({
      quantity: item.quantity,
      low_stock_threshold: item.low_stock_threshold,
      linked_service_ids: [...(item.linked_service_ids || [])]
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData(defaultEditData());
  };

  const getItemServiceNames = (item: InventoryItem) => {
    if (!item.linked_service_ids || item.linked_service_ids.length === 0) {
      return 'All Services (Shared)';
    }
    return item.linked_service_ids
      .map(id => services.find(s => s.id === id)?.name || 'Unknown')
      .join(', ');
  };

  const lowStockCount = filteredItems.filter(item => item.quantity <= item.low_stock_threshold).length;
  const totalUnits = filteredItems.reduce((sum, item) => sum + item.quantity, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Notifications */}
      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}
      {successMsg && (
        <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg flex items-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {successMsg}
        </div>
      )}

      {/* Header with Service Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Inventory Management</h2>
          <p className="text-sm text-slate-500 mt-0.5">Track supplies and manage stock levels per service</p>
        </div>
        <div className="flex gap-3">
          <select
            value={selectedServiceFilter}
            onChange={(e) => setSelectedServiceFilter(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Items</option>
            <option value="shared">Shared (All Services)</option>
            {services.map(service => (
              <option key={service.id} value={service.id}>
                {service.name} Only
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Item
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                {selectedServiceFilter === 'all' ? 'Total Items' : 'Filtered Items'}
              </p>
              <p className="text-2xl font-bold text-slate-800">{filteredItems.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          </div>
        </div>

        <div className={`rounded-xl border p-5 shadow-sm ${lowStockCount > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-slate-100'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-xs font-medium uppercase tracking-wider mb-1 ${lowStockCount > 0 ? 'text-red-600' : 'text-slate-500'}`}>Low Stock</p>
              <p className={`text-2xl font-bold ${lowStockCount > 0 ? 'text-red-700' : 'text-slate-800'}`}>{lowStockCount}</p>
            </div>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${lowStockCount > 0 ? 'bg-red-100' : 'bg-slate-100'}`}>
              <svg className={`w-6 h-6 ${lowStockCount > 0 ? 'text-red-600' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Total Units</p>
              <p className="text-2xl font-bold text-slate-800">{totalUnits}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Items Grid */}
      {filteredItems.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mb-3">
              <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-600">No inventory items found</p>
            <p className="text-xs text-slate-400 mt-1">
              {selectedServiceFilter === 'all' 
                ? 'Click "Add Item" to get started'
                : 'No items for this filter. Try changing the filter or add new items.'
              }
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const isLowStock = item.quantity <= item.low_stock_threshold;
            const isEditing = editingId === item.id;
            const isHighlighted = item.id === highlightedItemId;
            
            return (
              <div
                key={item.id}
                ref={(el) => { itemRefs.current[item.id] = el; }}
                className={`bg-white rounded-xl border shadow-sm p-5 transition-all hover:shadow-md ${
                  isLowStock ? 'border-red-200 bg-red-50/30' : 'border-slate-100'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-slate-800 truncate">{item.name}</h3>
                    {item.description && (
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{item.description}</p>
                    )}
                    {/* Service Assignment Badge */}
                    <div className="mt-2">
                      <span className="inline-flex items-center gap-1 text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full border border-purple-200">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        {getItemServiceNames(item)}
                      </span>
                    </div>
                  </div>
                  <span className={`ml-2 inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border flex-shrink-0 ${
                    isLowStock
                      ? 'bg-red-100 text-red-700 border-red-300'
                      : 'bg-green-100 text-green-700 border-green-300'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isLowStock ? 'bg-red-500' : 'bg-green-500'}`} />
                    {isLowStock ? 'Low Stock' : 'In Stock'}
                  </span>
                </div>

                {/* Quantity Info / Edit Form */}
                {isEditing ? (
                  <div className="space-y-3 mb-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Quantity</label>
                      <input
                        type="number"
                        value={editData.quantity}
                        onChange={(e) => setEditData({ ...editData, quantity: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Low Stock Threshold</label>
                      <input
                        type="number"
                        value={editData.low_stock_threshold}
                        onChange={(e) => setEditData({ ...editData, low_stock_threshold: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        min="0"
                      />
                    </div>
                    {/* Service Assignment in Edit Mode */}
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-2">Assign to Services</label>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        <label className="flex items-center gap-2 text-xs cursor-pointer p-1 hover:bg-slate-50 rounded">
                          <input
                            type="checkbox"
                            checked={editData.linked_service_ids.length === 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditData({ ...editData, linked_service_ids: [] });
                              }
                            }}
                            className="w-3 h-3 text-blue-600 rounded"
                          />
                          <span className="text-slate-700 font-medium">All Services (Shared)</span>
                        </label>
                        {services.map(service => (
                          <label key={service.id} className="flex items-center gap-2 text-xs cursor-pointer p-1 hover:bg-slate-50 rounded">
                            <input
                              type="checkbox"
                              checked={editData.linked_service_ids.includes(service.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setEditData(prev => ({
                                    ...prev,
                                    linked_service_ids: [...prev.linked_service_ids, service.id]
                                  }));
                                } else {
                                  setEditData(prev => ({
                                    ...prev,
                                    linked_service_ids: prev.linked_service_ids.filter(id => id !== service.id)
                                  }));
                                }
                              }}
                              className="w-3 h-3 text-blue-600 rounded"
                              disabled={editData.linked_service_ids.length === 0}
                            />
                            <span className="text-slate-700">{service.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-500 mb-0.5">Current Stock</p>
                      <p className="text-lg font-bold text-slate-800">
                        {item.quantity} <span className="text-sm font-normal text-slate-500">{item.unit}</span>
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-500 mb-0.5">Threshold</p>
                      <p className="text-lg font-bold text-slate-800">
                        {item.low_stock_threshold} <span className="text-sm font-normal text-slate-500">{item.unit}</span>
                      </p>
                    </div>
                  </div>
                )}

                {/* Vendor */}
                {item.vendor_email && !isEditing && (
                  <div className="mb-4 pb-4 border-b border-slate-100">
                    <p className="text-xs text-slate-500 mb-0.5">Vendor</p>
                    <p className="text-sm text-slate-700 truncate">{item.vendor_email}</p>
                  </div>
                )}

                {/* Actions */}
                {isEditing ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdateItem(item.id)}
                      disabled={saving}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs bg-blue-600 text-white hover:bg-blue-700 px-3 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      {saving ? (
                        <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      Save
                    </button>
                    <button
                      onClick={cancelEdit}
                      disabled={saving}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs bg-slate-100 text-slate-600 hover:bg-slate-200 px-3 py-2 rounded-lg font-medium transition-colors"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(item)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 px-3 py-2 rounded-lg font-medium transition-colors"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        setSelectedItem(item);
                        setShowUsageModal(true);
                      }}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-3 py-2 rounded-lg font-medium transition-colors"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Record Usage
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b border-slate-100 z-10">
              <h3 className="text-lg font-semibold text-slate-800">Add Inventory Item</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddItem} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Item Name *</label>
                <input
                  type="text"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Surgical Gloves"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
                <textarea
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                  placeholder="Optional description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Initial Quantity *</label>
                  <input
                    type="number"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="0"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Unit *</label>
                  <input
                    type="text"
                    value={newItem.unit}
                    onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="pieces, boxes, etc."
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Low Stock Threshold *</label>
                <input
                  type="number"
                  value={newItem.low_stock_threshold}
                  onChange={(e) => setNewItem({ ...newItem, low_stock_threshold: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                  required
                />
                <p className="text-xs text-slate-500 mt-1">You'll be alerted when stock reaches this level</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Vendor Email</label>
                <input
                  type="email"
                  value={newItem.vendor_email}
                  onChange={(e) => setNewItem({ ...newItem, vendor_email: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="vendor@example.com"
                />
              </div>

              {/* Service Assignment */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <label className="block text-sm font-medium text-purple-900 mb-2">Assign to Services</label>
                <div className="space-y-3">
                  {/* Radio-style selection */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm cursor-pointer p-2 hover:bg-purple-100 rounded">
                      <input
                        type="radio"
                        name="serviceAssignment"
                        checked={newItem.linked_service_ids.length === 0}
                        onChange={() => setNewItem({ ...newItem, linked_service_ids: [] })}
                        className="w-4 h-4 text-purple-600"
                      />
                      <span className="text-slate-700 font-medium">📦 All Services (Shared)</span>
                    </label>
                    
                    <label className="flex items-center gap-2 text-sm cursor-pointer p-2 hover:bg-purple-100 rounded">
                      <input
                        type="radio"
                        name="serviceAssignment"
                        checked={newItem.linked_service_ids.length > 0}
                        onChange={() => {
                          // When switching to specific services, select the first one by default
                          if (services.length > 0) {
                            setNewItem({ ...newItem, linked_service_ids: [services[0].id] });
                          }
                        }}
                        className="w-4 h-4 text-purple-600"
                      />
                      <span className="text-slate-700 font-medium">🎯 Specific Services</span>
                    </label>
                  </div>
                  
                  {/* Service checkboxes - only show when "Specific Services" is selected */}
                  {newItem.linked_service_ids.length > 0 && (
                    <div className="pl-6 pt-2 space-y-2 border-l-2 border-purple-300">
                      {services.map(service => (
                        <label key={service.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-purple-100 p-1 rounded">
                          <input
                            type="checkbox"
                            checked={newItem.linked_service_ids.includes(service.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewItem(prev => ({
                                  ...prev,
                                  linked_service_ids: [...prev.linked_service_ids, service.id]
                                }));
                              } else {
                                // Don't allow unchecking if it's the last one
                                if (newItem.linked_service_ids.length > 1) {
                                  setNewItem(prev => ({
                                    ...prev,
                                    linked_service_ids: prev.linked_service_ids.filter(id => id !== service.id)
                                  }));
                                }
                              }
                            }}
                            className="w-4 h-4 text-purple-600 rounded"
                          />
                          <span className="text-slate-700">{service.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Adding...' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Usage Modal */}
      {showUsageModal && selectedItem && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowUsageModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-800">Record Usage</h3>
              <button onClick={() => setShowUsageModal(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleRecordUsage} className="px-6 py-5 space-y-4">
              <div className="bg-slate-50 rounded-lg p-4 mb-4">
                <p className="text-sm font-medium text-slate-700 mb-1">{selectedItem.name}</p>
                <p className="text-xs text-slate-500">
                  Current stock: <span className="font-semibold text-slate-700">{selectedItem.quantity} {selectedItem.unit}</span>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Quantity Used *</label>
                <input
                  type="number"
                  value={usageData.quantity_used}
                  onChange={(e) => setUsageData({ ...usageData, quantity_used: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="1"
                  max={selectedItem.quantity}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes</label>
                <textarea
                  value={usageData.notes}
                  onChange={(e) => setUsageData({ ...usageData, notes: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Optional: Add notes about this usage"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowUsageModal(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Recording...' : 'Record Usage'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
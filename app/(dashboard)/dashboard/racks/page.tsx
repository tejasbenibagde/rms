'use client';

import { useEffect, useState } from 'react';
import {
  Archive,
  Plus,
  Pencil,
  Trash2,
  Loader,
  AlertCircle,
  ChevronDown,
  Search,
  BoxesIcon,
} from 'lucide-react';
import ImportExportButtons from '@/components/ImportExportButtons';

interface Department {
  id: string;
  name: string;
  floor: {
    id: string;
    name: string;
    building: { id: string; name: string };
  };
}

interface Rack {
  id: string;
  rackNumber: string;
  rackName: string;
  description?: string;
  status: string;
  capacity?: number;
  usedCapacity: number;
  isActive: boolean;
  department: Department;
  _count: { shelves: number; files: number };
  createdAt: string;
}

interface Shelf {
  id: string;
  name: string;
  position: number;
  description?: string;
  isActive: boolean;
  rackId: string;
  rack: { id: string; rackNumber: string; rackName: string };
  _count: { files: number };
}

type TabType = 'racks' | 'shelves';

export default function RacksPage() {
  const [racks, setRacks] = useState<Rack[]>([]);
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('racks');
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [expandedRack, setExpandedRack] = useState<string | null>(null);

  const [rackForm, setRackForm] = useState({
    rackNumber: '',
    rackName: '',
    description: '',
    departmentId: '',
    status: 'ACTIVE',
    capacity: '',
    isActive: true,
  });

  const [shelfForm, setShelfForm] = useState({
    name: '',
    position: '',
    description: '',
    rackId: '',
    isActive: true,
  });

  useEffect(() => {
    fetchDepartments();
    if (activeTab === 'racks') fetchRacks();
    else fetchShelves();
  }, [activeTab, searchTerm]);

  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/departments');
      const data = await response.json();
      setDepartments(data.departments || []);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    }
  };

  const fetchRacks = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`/api/racks?${params}`);
      const data = await response.json();
      setRacks(data.racks || []);
      setError('');
    } catch (error) {
      console.error('Failed to fetch racks:', error);
      setError('Failed to load racks');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchShelves = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/shelves');
      const data = await response.json();
      setShelves(data.shelves || []);
      setError('');
    } catch (error) {
      console.error('Failed to fetch shelves:', error);
      setError('Failed to load shelves');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = editingId ? `/api/racks/${editingId}` : '/api/racks';
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...rackForm,
          capacity: rackForm.capacity ? parseInt(rackForm.capacity) : null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save rack');
      }

      setRackForm({
        rackNumber: '',
        rackName: '',
        description: '',
        departmentId: '',
        status: 'ACTIVE',
        capacity: '',
        isActive: true,
      });
      setEditingId(null);
      setShowForm(false);
      await fetchRacks();
    } catch (error: any) {
      setError(error.message || 'Failed to save rack');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShelfSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = editingId ? `/api/shelves/${editingId}` : '/api/shelves';
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...shelfForm,
          position: parseInt(shelfForm.position),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save shelf');
      }

      setShelfForm({
        name: '',
        position: '',
        description: '',
        rackId: '',
        isActive: true,
      });
      setEditingId(null);
      setShowForm(false);
      await fetchShelves();
    } catch (error: any) {
      setError(error.message || 'Failed to save shelf');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRack = async (id: string) => {
    if (!confirm('Are you sure you want to delete this rack?')) return;

    try {
      const response = await fetch(`/api/racks/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete');
      await fetchRacks();
    } catch (error: any) {
      setError(error.message || 'Failed to delete rack');
    }
  };

  const handleDeleteShelf = async (id: string) => {
    if (!confirm('Are you sure you want to delete this shelf?')) return;

    try {
      const response = await fetch(`/api/shelves/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete');
      await fetchShelves();
    } catch (error: any) {
      setError(error.message || 'Failed to delete shelf');
    }
  };

  const handleEditRack = (rack: Rack) => {
    setRackForm({
      rackNumber: rack.rackNumber,
      rackName: rack.rackName,
      description: rack.description || '',
      departmentId: rack.department.id,
      status: rack.status,
      capacity: rack.capacity?.toString() || '',
      isActive: rack.isActive,
    });
    setEditingId(rack.id);
    setShowForm(true);
  };

  const handleEditShelf = (shelf: Shelf) => {
    setShelfForm({
      name: shelf.name,
      position: shelf.position.toString(),
      description: shelf.description || '',
      rackId: shelf.rackId,
      isActive: shelf.isActive,
    });
    setEditingId(shelf.id);
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <Archive className="w-8 h-8" />
          Racks & Shelves
        </h1>
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <ImportExportButtons
            entityType={activeTab === 'racks' ? 'racks' : 'shelves'}
            onImportSuccess={activeTab === 'racks' ? fetchRacks : fetchShelves}
          />
          <button
            onClick={() => {
              setEditingId(null);
              if (activeTab === 'racks') {
                setRackForm({
                  rackNumber: '',
                  rackName: '',
                  description: '',
                  departmentId: '',
                  status: 'ACTIVE',
                  capacity: '',
                  isActive: true,
                });
              } else {
                setShelfForm({
                  name: '',
                  position: '',
                  description: '',
                  rackId: '',
                  isActive: true,
                });
              }
              setShowForm(!showForm);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add {activeTab === 'racks' ? 'Rack' : 'Shelf'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-neutral-200">
        <button
          onClick={() => setActiveTab('racks')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'racks'
              ? 'border-primary text-primary'
              : 'border-transparent text-neutral-600 hover:text-foreground'
          }`}
        >
          Racks
        </button>
        <button
          onClick={() => setActiveTab('shelves')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'shelves'
              ? 'border-primary text-primary'
              : 'border-transparent text-neutral-600 hover:text-foreground'
          }`}
        >
          Shelves
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      {/* Racks Tab */}
      {activeTab === 'racks' && (
        <>
          {/* Add Rack Form */}
          {showForm && (
            <div className="bg-white border border-neutral-200 rounded-lg p-6 shadow-sm">
              <h2 className="text-lg font-bold text-foreground mb-4">
                {editingId ? 'Edit Rack' : 'Add New Rack'}
              </h2>
              <form onSubmit={handleRackSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Department *
                    </label>
                    <select
                      required
                      value={rackForm.departmentId}
                      onChange={(e) =>
                        setRackForm({ ...rackForm, departmentId: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Select a department</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.floor.building.name} - {d.floor.name} - {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Rack Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={rackForm.rackNumber}
                      onChange={(e) =>
                        setRackForm({ ...rackForm, rackNumber: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="e.g., R-01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Rack Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={rackForm.rackName}
                      onChange={(e) =>
                        setRackForm({ ...rackForm, rackName: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="e.g., Rack A"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Capacity (Files)
                    </label>
                    <input
                      type="number"
                      value={rackForm.capacity}
                      onChange={(e) =>
                        setRackForm({ ...rackForm, capacity: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="e.g., 100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Status
                    </label>
                    <select
                      value={rackForm.status}
                      onChange={(e) =>
                        setRackForm({ ...rackForm, status: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                      <option value="MAINTENANCE">Maintenance</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Active
                    </label>
                    <select
                      value={rackForm.isActive ? 'active' : 'inactive'}
                      onChange={(e) =>
                        setRackForm({ ...rackForm, isActive: e.target.value === 'active' })
                      }
                      className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Description
                    </label>
                    <textarea
                      value={rackForm.description}
                      onChange={(e) =>
                        setRackForm({ ...rackForm, description: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Optional description"
                      rows={2}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? 'Saving...' : editingId ? 'Update Rack' : 'Add Rack'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingId(null);
                    }}
                    className="px-4 py-2 border border-neutral-300 text-foreground rounded-lg hover:bg-neutral-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Search */}
          <div className="bg-white border border-neutral-200 rounded-lg p-4">
            <div className="flex items-center gap-2 px-4 py-2 border border-neutral-300 rounded-lg bg-neutral-50">
              <Search className="w-5 h-5 text-neutral-400" />
              <input
                type="text"
                placeholder="Search by rack number or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 bg-transparent outline-none text-foreground placeholder-neutral-500"
              />
            </div>
          </div>

          {/* Racks List */}
          {isLoading ? (
            <div className="bg-white border border-neutral-200 rounded-lg p-12 text-center">
              <Loader className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
              <p className="text-neutral-600">Loading racks...</p>
            </div>
          ) : racks.length === 0 ? (
            <div className="bg-white border border-neutral-200 rounded-lg p-12 text-center">
              <Archive className="w-12 h-12 text-neutral-400 mx-auto mb-3 opacity-50" />
              <p className="text-neutral-600">No racks found. Create your first rack!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {racks.map((rack) => (
                <div key={rack.id} className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedRack(expandedRack === rack.id ? null : rack.id)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-neutral-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <ChevronDown
                        className={`w-5 h-5 text-neutral-600 transition-transform ${
                          expandedRack === rack.id ? 'rotate-180' : ''
                        }`}
                      />
                      <div className="text-left">
                        <h3 className="font-semibold text-foreground">
                          {rack.rackNumber} - {rack.rackName}
                        </h3>
                        <p className="text-sm text-neutral-600 mt-0.5">
                          {rack.department.floor.building.name} / {rack.department.floor.name} / {rack.department.name}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-neutral-100 text-neutral-600 px-2 py-1 rounded-full">
                        {rack._count.files} files
                      </span>
                      <span className="text-xs bg-neutral-100 text-neutral-600 px-2 py-1 rounded-full">
                        {rack._count.shelves} shelves
                      </span>
                    </div>
                  </button>

                  {expandedRack === rack.id && (
                    <div className="border-t border-neutral-200 px-6 py-4 bg-neutral-50 space-y-3">
                      {rack.description && (
                        <p className="text-sm text-neutral-700">{rack.description}</p>
                      )}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-neutral-600">Status</span>
                          <p className="font-medium text-foreground">{rack.status}</p>
                        </div>
                        {rack.capacity && (
                          <div>
                            <span className="text-neutral-600">Capacity</span>
                            <p className="font-medium text-foreground">
                              {rack.usedCapacity}/{rack.capacity}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => handleEditRack(rack)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteRack(rack.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Shelves Tab */}
      {activeTab === 'shelves' && (
        <>
          {/* Add Shelf Form */}
          {showForm && (
            <div className="bg-white border border-neutral-200 rounded-lg p-6 shadow-sm">
              <h2 className="text-lg font-bold text-foreground mb-4">
                {editingId ? 'Edit Shelf' : 'Add New Shelf'}
              </h2>
              <form onSubmit={handleShelfSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Rack *
                    </label>
                    <select
                      required
                      value={shelfForm.rackId}
                      onChange={(e) =>
                        setShelfForm({ ...shelfForm, rackId: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Select a rack</option>
                      {racks.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.rackNumber} - {r.rackName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Shelf Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={shelfForm.name}
                      onChange={(e) =>
                        setShelfForm({ ...shelfForm, name: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="e.g., Shelf A"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Position *
                    </label>
                    <input
                      type="number"
                      required
                      value={shelfForm.position}
                      onChange={(e) =>
                        setShelfForm({ ...shelfForm, position: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="e.g., 1, 2, 3"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Active
                    </label>
                    <select
                      value={shelfForm.isActive ? 'active' : 'inactive'}
                      onChange={(e) =>
                        setShelfForm({ ...shelfForm, isActive: e.target.value === 'active' })
                      }
                      className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Description
                    </label>
                    <textarea
                      value={shelfForm.description}
                      onChange={(e) =>
                        setShelfForm({ ...shelfForm, description: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Optional description"
                      rows={2}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? 'Saving...' : editingId ? 'Update Shelf' : 'Add Shelf'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingId(null);
                    }}
                    className="px-4 py-2 border border-neutral-300 text-foreground rounded-lg hover:bg-neutral-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Shelves List */}
          {isLoading ? (
            <div className="bg-white border border-neutral-200 rounded-lg p-12 text-center">
              <Loader className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
              <p className="text-neutral-600">Loading shelves...</p>
            </div>
          ) : shelves.length === 0 ? (
            <div className="bg-white border border-neutral-200 rounded-lg p-12 text-center">
              <BoxesIcon className="w-12 h-12 text-neutral-400 mx-auto mb-3 opacity-50" />
              <p className="text-neutral-600">No shelves found. Create your first shelf!</p>
            </div>
          ) : (
            <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-neutral-50 border-b border-neutral-200">
                      <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-600">Name</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-600">Rack</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-600">Position</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-600">Files</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-600">Status</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-neutral-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {shelves.map((shelf) => (
                      <tr key={shelf.id} className="hover:bg-neutral-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-foreground">{shelf.name}</td>
                        <td className="px-6 py-4 text-sm text-neutral-600">
                          {shelf.rack.rackNumber} - {shelf.rack.rackName}
                        </td>
                        <td className="px-6 py-4 text-sm text-neutral-600">{shelf.position}</td>
                        <td className="px-6 py-4 text-sm text-neutral-600">{shelf._count.files}</td>
                        <td className="px-6 py-4 text-sm">
                          <span
                            className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                              shelf.isActive
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {shelf.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEditShelf(shelf)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteShelf(shelf.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

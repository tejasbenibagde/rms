'use client';

import { useEffect, useState } from 'react';
import {
  Layers,
  Plus,
  Pencil,
  Trash2,
  Loader,
  AlertCircle,
  ChevronDown,
} from 'lucide-react';
import ImportExportButtons from '@/components/ImportExportButtons';

interface Building {
  id: string;
  name: string;
}

interface Floor {
  id: string;
  name: string;
  floorNumber: number;
  description?: string;
  isActive: boolean;
  building: Building;
  _count: { departments: number };
  createdAt: string;
}

export default function FloorsPage() {
  const [floors, setFloors] = useState<Floor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [expandedBuilding, setExpandedBuilding] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    floorNumber: 0,
    description: '',
    buildingId: '',
    isActive: true,
  });

  useEffect(() => {
    fetchBuildings();
    fetchFloors();
  }, []);

  const fetchBuildings = async () => {
    try {
      const response = await fetch('/api/buildings');
      const data = await response.json();
      setBuildings(data);
    } catch (error) {
      console.error('Failed to fetch buildings:', error);
    }
  };

  const fetchFloors = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/floors');
      const data = await response.json();
      setFloors(data.floors || []);
      setError('');
    } catch (error) {
      console.error('Failed to fetch floors:', error);
      setError('Failed to load floors');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = editingId ? `/api/floors/${editingId}` : '/api/floors';
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save floor');
      }

      setFormData({
        name: '',
        floorNumber: 0,
        description: '',
        buildingId: '',
        isActive: true,
      });
      setEditingId(null);
      setShowForm(false);
      await fetchFloors();
    } catch (error: any) {
      setError(error.message || 'Failed to save floor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (floor: Floor) => {
    setFormData({
      name: floor.name,
      floorNumber: floor.floorNumber,
      description: floor.description || '',
      buildingId: floor.building.id,
      isActive: floor.isActive,
    });
    setEditingId(floor.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this floor?')) return;

    try {
      const response = await fetch(`/api/floors/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete');
      await fetchFloors();
    } catch (error: any) {
      setError(error.message || 'Failed to delete floor');
    }
  };

  const toggleBuildingExpand = (buildingId: string) => {
    setExpandedBuilding(expandedBuilding === buildingId ? null : buildingId);
  };

  const floorsByBuilding = buildings.map((building) => ({
    ...building,
    floors: floors.filter((f) => f.building.id === building.id),
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <Layers className="w-8 h-8" />
          Floor Management
        </h1>
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <ImportExportButtons entityType="floors" onImportSuccess={fetchFloors} />
          <button
            onClick={() => {
              setEditingId(null);
              setFormData({
                name: '',
                floorNumber: 0,
                description: '',
                buildingId: '',
                isActive: true,
              });
              setShowForm(!showForm);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Floor
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Add Floor Form */}
      {showForm && (
        <div className="bg-white border border-neutral-200 rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-bold text-foreground mb-4">
            {editingId ? 'Edit Floor' : 'Add New Floor'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Building *
                </label>
                <select
                  required
                  value={formData.buildingId}
                  onChange={(e) => setFormData({ ...formData, buildingId: e.target.value })}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select a building</option>
                  {buildings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Floor Number *
                </label>
                <input
                  type="number"
                  required
                  value={formData.floorNumber}
                  onChange={(e) => setFormData({ ...formData, floorNumber: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., 1, 2, 3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Floor Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., Ground Floor"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Status
                </label>
                <select
                  value={formData.isActive ? 'active' : 'inactive'}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'active' })}
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
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                {isSubmitting ? 'Saving...' : editingId ? 'Update Floor' : 'Add Floor'}
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

      {/* Floors List by Building */}
      {isLoading ? (
        <div className="bg-white border border-neutral-200 rounded-lg p-12 text-center">
          <Loader className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
          <p className="text-neutral-600">Loading floors...</p>
        </div>
      ) : floorsByBuilding.some((b) => b.floors.length > 0) ? (
        <div className="space-y-4">
          {floorsByBuilding.map((building) => (
            building.floors.length > 0 && (
              <div key={building.id} className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleBuildingExpand(building.id)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-neutral-50 transition-colors border-b border-neutral-200"
                >
                  <div className="flex items-center gap-3">
                    <ChevronDown
                      className={`w-5 h-5 text-neutral-600 transition-transform ${
                        expandedBuilding === building.id ? 'rotate-180' : ''
                      }`}
                    />
                    <h3 className="font-semibold text-foreground">{building.name}</h3>
                    <span className="text-xs bg-neutral-100 text-neutral-600 px-2 py-1 rounded-full">
                      {building.floors.length} floor{building.floors.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </button>

                {expandedBuilding === building.id && (
                  <div className="divide-y divide-neutral-200">
                    {building.floors.map((floor) => (
                      <div key={floor.id} className="px-6 py-4 hover:bg-neutral-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-foreground">{floor.name}</h4>
                              <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                                Floor {floor.floorNumber}
                              </span>
                              <span
                                className={`text-xs px-2 py-1 rounded-full ${
                                  floor.isActive
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-gray-100 text-gray-700'
                                }`}
                              >
                                {floor.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                            {floor.description && (
                              <p className="text-sm text-neutral-600 mt-1">{floor.description}</p>
                            )}
                            <p className="text-xs text-neutral-500 mt-2">
                              {floor._count.departments} department{floor._count.departments !== 1 ? 's' : ''}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(floor)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(floor.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          ))}
        </div>
      ) : (
        <div className="bg-white border border-neutral-200 rounded-lg p-12 text-center">
          <Layers className="w-12 h-12 text-neutral-400 mx-auto mb-3 opacity-50" />
          <p className="text-neutral-600">No floors found. Create your first floor!</p>
        </div>
      )}
    </div>
  );
}

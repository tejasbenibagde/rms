'use client';

import { useEffect, useState } from 'react';
import {
  FolderOpen,
  Plus,
  Pencil,
  Trash2,
  Loader,
  AlertCircle,
  Search,
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
  building: Building;
}

interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  floor: Floor;
  _count: { racks: number; files: number };
  createdAt: string;
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [floors, setFloors] = useState<Floor[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    floorId: '',
    isActive: true,
  });

  useEffect(() => {
    fetchFloors();
    fetchDepartments();
  }, [searchTerm]);

  const fetchFloors = async () => {
    try {
      const response = await fetch('/api/floors');
      const data = await response.json();
      setFloors(data.floors || []);
    } catch (error) {
      console.error('Failed to fetch floors:', error);
    }
  };

  const fetchDepartments = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`/api/departments?${params}`);
      const data = await response.json();
      setDepartments(data.departments || []);
      setError('');
    } catch (error) {
      console.error('Failed to fetch departments:', error);
      setError('Failed to load departments');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = editingId ? `/api/departments/${editingId}` : '/api/departments';
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save department');
      }

      setFormData({
        name: '',
        code: '',
        description: '',
        floorId: '',
        isActive: true,
      });
      setEditingId(null);
      setShowForm(false);
      await fetchDepartments();
    } catch (error: any) {
      setError(error.message || 'Failed to save department');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (dept: Department) => {
    setFormData({
      name: dept.name,
      code: dept.code,
      description: dept.description || '',
      floorId: dept.floor.id,
      isActive: dept.isActive,
    });
    setEditingId(dept.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this department?')) return;

    try {
      const response = await fetch(`/api/departments/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete');
      await fetchDepartments();
    } catch (error: any) {
      setError(error.message || 'Failed to delete department');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <FolderOpen className="w-8 h-8" />
          Department Management
        </h1>
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <ImportExportButtons entityType="departments" onImportSuccess={fetchDepartments} />
          <button
            onClick={() => {
              setEditingId(null);
              setFormData({
                name: '',
                code: '',
                description: '',
                floorId: '',
                isActive: true,
              });
              setShowForm(!showForm);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Department
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

      {/* Add Department Form */}
      {showForm && (
        <div className="bg-white border border-neutral-200 rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-bold text-foreground mb-4">
            {editingId ? 'Edit Department' : 'Add New Department'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Floor *
                </label>
                <select
                  required
                  value={formData.floorId}
                  onChange={(e) => setFormData({ ...formData, floorId: e.target.value })}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select a floor</option>
                  {floors.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.building.name} - {f.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Department Code *
                </label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., HR, FIN, IT"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Department Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., Human Resources"
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
                {isSubmitting ? 'Saving...' : editingId ? 'Update Department' : 'Add Department'}
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
            placeholder="Search by name or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-transparent outline-none text-foreground placeholder-neutral-500"
          />
        </div>
      </div>

      {/* Departments List */}
      {isLoading ? (
        <div className="bg-white border border-neutral-200 rounded-lg p-12 text-center">
          <Loader className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
          <p className="text-neutral-600">Loading departments...</p>
        </div>
      ) : departments.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-lg p-12 text-center">
          <FolderOpen className="w-12 h-12 text-neutral-400 mx-auto mb-3 opacity-50" />
          <p className="text-neutral-600">No departments found. Create your first department!</p>
        </div>
      ) : (
        <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-600">Name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-600">Code</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-600">Building / Floor</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-600">Racks</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-600">Files</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-600">Status</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-neutral-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {departments.map((dept) => (
                  <tr key={dept.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-foreground">{dept.name}</td>
                    <td className="px-6 py-4 text-sm font-mono text-neutral-600">{dept.code}</td>
                    <td className="px-6 py-4 text-sm text-neutral-600">
                      <div className="space-y-0.5">
                        <div>{dept.floor.building.name}</div>
                        <div className="text-xs text-neutral-500">{dept.floor.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-600">{dept._count.racks}</td>
                    <td className="px-6 py-4 text-sm text-neutral-600">{dept._count.files}</td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                          dept.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {dept.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(dept)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(dept.id)}
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
    </div>
  );
}

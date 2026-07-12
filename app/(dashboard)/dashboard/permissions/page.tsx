'use client';

import { useEffect, useState } from 'react';
import {
  List,
  Plus,
  Pencil,
  Trash2,
  Loader,
  AlertCircle,
  Search,
  Check,
  X,
} from 'lucide-react';

interface Permission {
  id: string;
  name: string;
  description?: string;
  _count: { roles: number };
  createdAt: string;
}

export default function PermissionsPage() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  useEffect(() => {
    fetchPermissions();
  }, [searchTerm]);

  const fetchPermissions = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`/api/permissions?${params}`);
      const data = await response.json();
      setPermissions(data.permissions || []);
      setError('');
    } catch (error) {
      console.error('Failed to fetch permissions:', error);
      setError('Failed to load permissions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = editingId ? `/api/permissions/${editingId}` : '/api/permissions';
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save permission');
      }

      // Reset form
      setFormData({
        name: '',
        description: '',
      });
      setEditingId(null);
      setShowForm(false);
      await fetchPermissions();
    } catch (error: any) {
      setError(error.message || 'Failed to save permission');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (permission: Permission) => {
    setFormData({
      name: permission.name,
      description: permission.description || '',
    });
    setEditingId(permission.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this permission?')) return;

    try {
      const response = await fetch(`/api/permissions/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete');
      await fetchPermissions();
    } catch (error: any) {
      setError(error.message || 'Failed to delete permission');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <List className="w-8 h-8" />
          Permission Management
        </h1>
        <button
          onClick={() => {
            setEditingId(null);
            setFormData({
              name: '',
              description: '',
            });
            setShowForm(!showForm);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Permission
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      {/* Add Permission Form */}
      {showForm && (
        <div className="bg-white border border-neutral-200 rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-bold text-foreground mb-4">
            {editingId ? 'Edit Permission' : 'Add New Permission'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Permission Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., can_delete_files, can_export_excel"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Permission description"
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
                {isSubmitting ? 'Saving...' : editingId ? 'Update Permission' : 'Add Permission'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setFormData({
                    name: '',
                    description: '',
                  });
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
            placeholder="Search by permission name or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-transparent outline-none text-foreground placeholder-neutral-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="p-1 hover:bg-neutral-200 rounded"
            >
              <X className="w-4 h-4 text-neutral-600" />
            </button>
          )}
        </div>
      </div>

      {/* Permissions List */}
      {isLoading ? (
        <div className="bg-white border border-neutral-200 rounded-lg p-12 text-center">
          <Loader className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
          <p className="text-neutral-600">Loading permissions...</p>
        </div>
      ) : permissions.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-lg p-12 text-center">
          <List className="w-12 h-12 text-neutral-400 mx-auto mb-3 opacity-50" />
          <p className="text-neutral-600">No permissions found. Create your first permission!</p>
        </div>
      ) : (
        <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-600">Name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-600">Description</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-600">Assigned Roles</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-600">Created</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-neutral-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {permissions.map((permission) => (
                  <tr key={permission.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-foreground">{permission.name}</td>
                    <td className="px-6 py-4 text-sm text-neutral-600">{permission.description || '-'}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">
                        {permission._count.roles} roles
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-600">
                      {new Date(permission.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(permission)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(permission.id)}
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
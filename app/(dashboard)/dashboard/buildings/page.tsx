'use client';

import { useEffect, useState } from 'react';
import { Building2, Plus, Trash2, Edit2, Loader } from 'lucide-react';
import ImportExportButtons from '@/components/ImportExportButtons';

interface Building {
  id: string;
  name: string;
  code: string;
  description?: string;
  address?: string;
  isActive: boolean;
  createdAt: string;
  _count?: { floors: number };
}

export default function BuildingsPage() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    address: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchBuildings();
  }, []);

  const fetchBuildings = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/buildings');
      const data = await response.json();
      setBuildings(data);
    } catch (error) {
      console.error('Failed to fetch buildings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/buildings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setFormData({ name: '', code: '', description: '', address: '' });
        setShowForm(false);
        await fetchBuildings();
      }
    } catch (error) {
      console.error('Failed to create building:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this building?')) {
      try {
        const response = await fetch(`/api/buildings/${id}`, {
          method: 'DELETE',
        });
        if (response.ok) {
          await fetchBuildings();
        }
      } catch (error) {
        console.error('Failed to delete building:', error);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <Building2 className="w-8 h-8" />
          Buildings Management
        </h1>
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <ImportExportButtons entityType="buildings" onImportSuccess={fetchBuildings} />
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Building
          </button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white border border-neutral-200 rounded-lg p-6">
          <h2 className="text-lg font-bold text-foreground mb-4">Add New Building</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Building Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., Head Office"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Code *
                </label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., HO-01"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Building description"
                  rows={2}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Building address"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Add Building'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-neutral-300 text-foreground rounded-lg hover:bg-neutral-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Buildings List */}
      <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <Loader className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
            <p className="text-neutral-600">Loading buildings...</p>
          </div>
        ) : buildings.length === 0 ? (
          <div className="p-8 text-center">
            <Building2 className="w-12 h-12 text-neutral-400 mx-auto mb-3 opacity-50" />
            <p className="text-neutral-600">No buildings found. Create your first building!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-600">Name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-600">Code</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-600">Address</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-600">Floors</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-neutral-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {buildings.map((building) => (
                  <tr key={building.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-foreground">{building.name}</td>
                    <td className="px-6 py-4 text-sm text-neutral-600">{building.code}</td>
                    <td className="px-6 py-4 text-sm text-neutral-600">{building.address || '-'}</td>
                    <td className="px-6 py-4 text-sm text-neutral-600">{building._count?.floors || 0}</td>
                    <td className="px-6 py-4 text-sm text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          className="p-2 text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(building.id)}
                          className="p-2 text-error hover:bg-error/10 rounded-lg transition-colors"
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
        )}
      </div>
    </div>
  );
}

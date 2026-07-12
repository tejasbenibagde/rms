'use client';

import { useEffect, useState } from 'react';
import {
  Folder,
  Plus,
  Pencil,
  Trash2,
  Loader,
  AlertCircle,
  Search,
  Check,
  X,
  Shield,
  Info,
  Sparkles,
  Key,
  FileText,
  Layers,
  MapPin,
  Lock
} from 'lucide-react';

interface Permission {
  id: string;
  name: string;
  description?: string;
}

interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: Permission[];
  _count: { users: number };
  createdAt: string;
}

// Layman-friendly permission dictionary
const PERMISSION_METADATA: Record<string, { label: string; category: string; description: string; icon: any }> = {
  'files.create': {
    label: 'Register New Files',
    category: 'File & Document Registry',
    description: 'Allows registering and adding new physical files into the system.',
    icon: FileText
  },
  'files.read': {
    label: 'Search & View Files',
    category: 'File & Document Registry',
    description: 'Enables searching, viewing location information, and checking file details.',
    icon: FileText
  },
  'files.update': {
    label: 'Edit Files & Folders',
    category: 'File & Document Registry',
    description: 'Allows updating file names, descriptions, departments, and years.',
    icon: FileText
  },
  'files.delete': {
    label: 'Remove / Archive Files',
    category: 'File & Document Registry',
    description: 'Enables deleting files or moving them to the recycle bin.',
    icon: FileText
  },
  'checkout.create': {
    label: 'Issue / Checkout Files',
    category: 'File Issuance & Borrowing',
    description: 'Allows lending physical files to employees and recording borrow history.',
    icon: Key
  },
  'checkout.return': {
    label: 'Return Borrowed Files',
    category: 'File Issuance & Borrowing',
    description: 'Allows marking borrowed files as returned and placing them back on shelves.',
    icon: Key
  },
  'locations.manage': {
    label: 'Configure Physical Archives',
    category: 'Archive Structure & Layout',
    description: 'Allows configuring Buildings, Floors, Departments, Racks, and Shelves.',
    icon: MapPin
  },
  'users.manage': {
    label: 'Manage Staff Accounts',
    category: 'System Security & Access',
    description: 'Allows adding, editing, or deactivating staff member accounts.',
    icon: Shield
  },
  'system.admin': {
    label: 'Super Master Access',
    category: 'System Security & Access',
    description: 'Grants master override control over all options, configurations, and logs.',
    icon: Lock
  }
};

// Badges and styles for categories
const CATEGORY_STYLES: Record<string, { bg: string; text: string; border: string; iconBg: string }> = {
  'File & Document Registry': {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    iconBg: 'bg-blue-100 text-blue-800'
  },
  'File Issuance & Borrowing': {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    iconBg: 'bg-purple-100 text-purple-800'
  },
  'Archive Structure & Layout': {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    iconBg: 'bg-emerald-100 text-emerald-800'
  },
  'System Security & Access': {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    iconBg: 'bg-amber-100 text-amber-800'
  }
};

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());

  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  useEffect(() => {
    fetchPermissions();
    fetchRoles();
  }, [searchTerm]);

  const fetchPermissions = async () => {
    try {
      const response = await fetch('/api/permissions');
      const data = await response.json();
      setPermissions(data.permissions || []);
    } catch (error) {
      console.error('Failed to fetch permissions:', error);
    }
  };

  const fetchRoles = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`/api/roles?${params}`);
      const data = await response.json();
      setRoles(data.roles || []);
      setError('');
    } catch (error) {
      console.error('Failed to fetch roles:', error);
      setError('Failed to load roles');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = editingId ? `/api/roles/${editingId}` : '/api/roles';
      const method = editingId ? 'PUT' : 'POST';

      // Submit both the name/desc and the list of checked permission IDs
      const payload = {
        ...formData,
        permissionIds: Array.from(selectedPermissions)
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save role');
      }

      // Clear form
      setFormData({
        name: '',
        description: '',
      });
      setSelectedPermissions(new Set());
      setEditingId(null);
      setShowForm(false);
      await fetchRoles();
    } catch (error: any) {
      setError(error.message || 'Failed to save role');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (role: Role) => {
    setFormData({
      name: role.name,
      description: role.description || '',
    });
    
    // Correctly extract and map permission IDs from the flattened role.permissions
    const permissionIds = new Set(role.permissions.map(p => p.id));
    setSelectedPermissions(permissionIds);
    setEditingId(role.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this role?')) return;

    try {
      const response = await fetch(`/api/roles/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete');
      }
      await fetchRoles();
    } catch (error: any) {
      setError(error.message || 'Failed to delete role');
    }
  };

  const togglePermission = (permissionId: string) => {
    const newSelected = new Set(selectedPermissions);
    if (newSelected.has(permissionId)) {
      newSelected.delete(permissionId);
    } else {
      newSelected.add(permissionId);
    }
    setSelectedPermissions(newSelected);
  };

  // Helper to resolve friendly metadata
  const getPermissionMeta = (name: string) => {
    if (PERMISSION_METADATA[name]) {
      return PERMISSION_METADATA[name];
    }
    // Fallback parsing for new/unmapped permissions
    const cleanLabel = name
      .replace(/[._]/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
    return {
      label: cleanLabel,
      category: 'Additional Tools',
      description: `Allows executing custom activity/operation: ${name}`,
      icon: Shield
    };
  };

  // Quick Preset Handlers
  const applyPreset = (presetName: 'admin' | 'clerk' | 'manager' | 'auditor' | 'clear') => {
    const newSelected = new Set<string>();
    
    if (presetName === 'clear') {
      setSelectedPermissions(newSelected);
      return;
    }

    let targetNames: string[] = [];
    if (presetName === 'admin') {
      targetNames = permissions.map(p => p.name);
    } else if (presetName === 'clerk') {
      targetNames = ['files.create', 'files.read', 'files.update', 'checkout.create', 'checkout.return'];
    } else if (presetName === 'manager') {
      targetNames = ['files.create', 'files.read', 'files.update', 'locations.manage', 'checkout.create', 'checkout.return'];
    } else if (presetName === 'auditor') {
      targetNames = ['files.read'];
    }

    permissions.forEach(p => {
      if (targetNames.includes(p.name)) {
        newSelected.add(p.id);
      }
    });

    setSelectedPermissions(newSelected);
  };

  // Group current available permissions by category
  const categoriesMap: Record<string, Permission[]> = {};
  permissions.forEach(p => {
    const meta = getPermissionMeta(p.name);
    if (!categoriesMap[meta.category]) {
      categoriesMap[meta.category] = [];
    }
    categoriesMap[meta.category].push(p);
  });

  return (
    <div className="space-y-6">
      {/* Description Info Header */}
      <div className="bg-gradient-to-r from-neutral-800 to-neutral-900 text-white rounded-xl p-6 shadow-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Shield className="w-8 h-8 text-primary" />
              Staff Rights & Roles
            </h1>
            <p className="text-sm text-neutral-300">
              Manage what different employees can see and do in the system. Use our simplified checkboxes to grant or restrict specific powers.
            </p>
          </div>
          <button
            onClick={() => {
              setEditingId(null);
              setFormData({
                name: '',
                description: '',
              });
              setSelectedPermissions(new Set());
              setShowForm(!showForm);
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-white text-neutral-900 rounded-lg font-semibold hover:bg-neutral-100 transition-colors shadow"
          >
            {showForm ? <X className="w-5 h-5 text-red-600" /> : <Plus className="w-5 h-5 text-primary" />}
            {showForm ? 'Close Setup' : 'Create Custom Role'}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-red-800">Something went wrong</h4>
            <p className="text-xs text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Add / Edit Role Form */}
      {showForm && (
        <div className="bg-white border border-neutral-200 rounded-xl shadow-lg overflow-hidden animate-in fade-in duration-200">
          <div className="p-6 border-b border-neutral-100 bg-neutral-50/50">
            <h2 className="text-xl font-bold text-neutral-900">
              {editingId ? '✏️ Edit Existing Role' : '✨ Setup a New Staff Role'}
            </h2>
            <p className="text-xs text-neutral-600 mt-0.5">
              Specify a friendly name for this group of staff and check the abilities they should have.
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-1.5">
                  What is this Role called? *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-neutral-800"
                  placeholder="e.g., Clerk, Supervisor, Auditor, Accountant"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-1.5">
                  Briefly describe who has this role
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-neutral-800"
                  placeholder="e.g., Assigned to ground-floor record clerks who issue files."
                  rows={2}
                />
              </div>
            </div>

            {/* Quick Presets */}
            <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-blue-900">✨ Click a Preset to Auto-configure:</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => applyPreset('admin')}
                  className="px-3 py-1.5 bg-neutral-900 text-white hover:bg-neutral-800 text-xs font-semibold rounded-lg transition-colors shadow-sm"
                >
                  👑 Master Admin (All Powers)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('manager')}
                  className="px-3 py-1.5 bg-white text-emerald-800 border border-emerald-200 hover:bg-emerald-50 text-xs font-semibold rounded-lg transition-colors shadow-sm"
                >
                  🏢 Manager / Supervisor
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('clerk')}
                  className="px-3 py-1.5 bg-white text-blue-800 border border-blue-200 hover:bg-blue-50 text-xs font-semibold rounded-lg transition-colors shadow-sm"
                >
                  📝 File Clerk / Operator
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('auditor')}
                  className="px-3 py-1.5 bg-white text-purple-800 border border-purple-200 hover:bg-purple-50 text-xs font-semibold rounded-lg transition-colors shadow-sm"
                >
                  🔍 Guest / Auditor (View Only)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('clear')}
                  className="px-3 py-1.5 bg-white text-neutral-500 border border-neutral-200 hover:bg-neutral-50 text-xs font-semibold rounded-lg transition-colors"
                >
                  🧹 Clear Selection
                </button>
              </div>
            </div>

            {/* Structured Permissions Grouping */}
            <div className="space-y-6">
              <div className="border-t border-neutral-100 pt-4">
                <h3 className="text-md font-bold text-neutral-900 mb-1">📋 Check Allowed Abilities:</h3>
                <p className="text-xs text-neutral-500">Enable or disable specific rights for this role. Hover to read detail cards.</p>
              </div>

              {Object.keys(categoriesMap).length === 0 ? (
                <div className="text-center py-4 text-neutral-500 text-sm">
                  No abilities found in database. Create them in permissions section first.
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {Object.entries(categoriesMap).map(([category, items]) => {
                    const style = CATEGORY_STYLES[category] || {
                      bg: 'bg-neutral-50',
                      text: 'text-neutral-800',
                      border: 'border-neutral-200',
                      iconBg: 'bg-neutral-100 text-neutral-700'
                    };

                    return (
                      <div key={category} className={`border ${style.border} rounded-xl p-5 ${style.bg}/20 shadow-sm space-y-4`}>
                        <div className="flex items-center gap-2 pb-2 border-b border-neutral-100">
                          <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase ${style.iconBg}`}>
                            {category}
                          </span>
                        </div>
                        <div className="space-y-3">
                          {items.map((perm) => {
                            const meta = getPermissionMeta(perm.name);
                            const PermIcon = meta.icon;
                            const isChecked = selectedPermissions.has(perm.id);

                            return (
                              <label
                                key={perm.id}
                                className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer select-none ${
                                  isChecked
                                    ? 'bg-white border-neutral-900 ring-1 ring-neutral-900 shadow-sm'
                                    : 'bg-white/80 border-neutral-200 hover:bg-white hover:border-neutral-300'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => togglePermission(perm.id)}
                                  className="mt-1 h-4.5 w-4.5 text-neutral-900 rounded border-neutral-300 focus:ring-neutral-900"
                                />
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1.5">
                                    <PermIcon className="w-4 h-4 text-neutral-600" />
                                    <span className="font-semibold text-sm text-neutral-800">
                                      {meta.label}
                                    </span>
                                  </div>
                                  <p className="text-xs text-neutral-500 leading-relaxed">
                                    {meta.description}
                                  </p>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Selected Summary Counter */}
            <div className="bg-neutral-50 border border-neutral-200 p-4 rounded-lg flex items-center justify-between text-neutral-700">
              <span className="text-sm font-semibold flex items-center gap-1.5">
                <Info className="w-4 h-4 text-neutral-500" />
                This role currently grants:
              </span>
              <span className="px-3 py-1 bg-neutral-900 text-white rounded-full text-xs font-bold">
                {selectedPermissions.size} selected ability / abilities
              </span>
            </div>

            {/* Form Actions */}
            <div className="flex gap-2 pt-2 border-t border-neutral-100">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-neutral-900 text-white font-semibold rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50 flex items-center gap-2 shadow"
              >
                {isSubmitting ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : editingId ? (
                  'Update Role'
                ) : (
                  'Create Role'
                )}
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
                  setSelectedPermissions(new Set());
                }}
                className="px-5 py-2.5 border border-neutral-300 text-neutral-700 font-semibold rounded-lg hover:bg-neutral-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search & Stats Card */}
      <div className="bg-white border border-neutral-200 rounded-xl p-4 flex flex-col sm:flex-row items-center gap-4 shadow-sm">
        <div className="flex-1 w-full flex items-center gap-2 px-4 py-2.5 border border-neutral-300 rounded-lg bg-neutral-50 focus-within:ring-2 focus-within:ring-neutral-900 transition-shadow">
          <Search className="w-5 h-5 text-neutral-400" />
          <input
            type="text"
            placeholder="Search defined roles by name or key info..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-transparent outline-none text-neutral-800 placeholder-neutral-500 text-sm"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="p-1 hover:bg-neutral-200 rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-neutral-500" />
            </button>
          )}
        </div>
        
        <div className="text-xs font-semibold text-neutral-500 bg-neutral-100 px-3 py-2 rounded-lg">
          Roles Defined: {roles.length}
        </div>
      </div>

      {/* Roles List */}
      {isLoading ? (
        <div className="bg-white border border-neutral-200 rounded-xl p-16 text-center shadow-sm">
          <Loader className="w-8 h-8 animate-spin text-neutral-900 mx-auto mb-3" />
          <p className="text-neutral-600 font-medium">Retrieving staff roles registry...</p>
        </div>
      ) : roles.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-xl p-16 text-center shadow-sm">
          <Folder className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-neutral-800">No staff roles found</h3>
          <p className="text-sm text-neutral-500 max-w-sm mx-auto mt-1">
            Create custom roles and configure specific system rules for your staff. Click &quot;Create Custom Role&quot; above to begin.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {roles.map((role) => (
            <div key={role.id} className="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm hover:border-neutral-300 transition-all">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-neutral-100 pb-4 mb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-xl font-bold text-neutral-900">{role.name}</h2>
                    <span className="px-2.5 py-0.5 bg-neutral-950 text-white text-[10px] font-bold rounded-full">
                      {role._count.users} Assigned User(s)
                    </span>
                  </div>
                  <p className="text-sm text-neutral-500">{role.description || 'No description provided.'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(role)}
                    className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-lg border border-neutral-100 hover:border-blue-200 transition-colors"
                    title="Edit Role abilities"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(role.id)}
                    className="p-2.5 text-red-600 hover:bg-red-50 rounded-lg border border-neutral-100 hover:border-red-200 transition-colors"
                    title="Delete this role"
                    disabled={role._count.users > 0}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Group permissions inside role for clean layout */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Granted Powers / Access Rights:</h4>
                <div className="flex flex-wrap gap-2">
                  {role.permissions.map((p) => {
                    const meta = getPermissionMeta(p.name);
                    const style = CATEGORY_STYLES[meta.category] || {
                      bg: 'bg-neutral-50',
                      text: 'text-neutral-700',
                      border: 'border-neutral-200',
                    };

                    return (
                      <span
                        key={p.id}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 border rounded-lg text-xs font-medium shadow-sm ${style.bg} ${style.text} ${style.border}`}
                        title={meta.description}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70"></span>
                        {meta.label}
                      </span>
                    );
                  })}
                  {role.permissions.length === 0 && (
                    <span className="px-3 py-1 bg-neutral-100 text-neutral-500 border border-neutral-200 text-xs font-medium rounded-lg">
                      🚫 None (No system access)
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

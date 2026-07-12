'use client';

import { useEffect, useState } from 'react';
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  Loader,
  AlertCircle,
  Search,
  Check,
  X,
  MapPin,
  Shield,
  Info,
  HelpCircle,
  UserCheck,
  Lock,
  Mail
} from 'lucide-react';
import ScopeSelector from '@/components/ScopeSelector';

interface Role {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  lastLogin?: string;
  role: Role;
  userScopes: Array<{
    id: string;
    buildingId?: string;
    building?: { name: string };
    floorId?: string;
    floor?: { name: string };
    departmentId?: string;
    department?: { name: string };
    rackId?: string;
    rack?: { rackName: string };
  }>;
  createdAt: string;
}

interface UserFormState {
  name: string;
  email: string;
  password?: string;
  roleId: string;
  isActive: boolean;
  scope: {
    buildingId?: string;
    floorId?: string;
    departmentId?: string;
    rackId?: string;
  };
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState<UserFormState>({
    name: '',
    email: '',
    password: '',
    roleId: '',
    isActive: true,
    scope: {
      buildingId: '',
      floorId: '',
      departmentId: '',
      rackId: '',
    },
  });

  useEffect(() => {
    fetchUsers();
  }, [searchTerm]);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`/api/users?${params}`);
      const data = await response.json();
      setUsers(data.users || []);
      setRoles(data.roles || []);
      setError('');
    } catch (error) {
      console.error('Failed to fetch users:', error);
      setError('Failed to load users list');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = editingId ? `/api/users/${editingId}` : '/api/users';
      const method = editingId ? 'PUT' : 'POST';

      // Always send name, email, roleId, isActive, password, and scope
      const payload = {
        name: formData.name,
        email: formData.email,
        roleId: formData.roleId,
        isActive: formData.isActive,
        scope: formData.scope,
        ...(formData.password && { password: formData.password }),
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save user account');
      }

      // Reset form
      setFormData({
        name: '',
        email: '',
        password: '',
        roleId: '',
        isActive: true,
        scope: {
          buildingId: '',
          floorId: '',
          departmentId: '',
          rackId: '',
        },
      });
      setEditingId(null);
      setShowForm(false);
      await fetchUsers();
    } catch (error: any) {
      setError(error.message || 'Failed to save user account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (user: User) => {
    const userScope = user.userScopes?.[0] || {};
    setFormData({
      name: user.name,
      email: user.email,
      password: '', // Leave password empty for security on edits
      roleId: user.role.id,
      isActive: user.isActive,
      scope: {
        buildingId: userScope.buildingId || '',
        floorId: userScope.floorId || '',
        departmentId: userScope.departmentId || '',
        rackId: userScope.rackId || '',
      },
    });
    setEditingId(user.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user account?')) return;

    try {
      const response = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete');
      }
      await fetchUsers();
    } catch (error: any) {
      setError(error.message || 'Failed to delete user account');
    }
  };

  // Helper to format scopes into descriptive, layman-friendly breadcrumbs
  const formatUserScope = (userScopes: any[]) => {
    if (!userScopes || userScopes.length === 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 text-xs font-semibold rounded-lg">
          🌍 Full System Access
        </span>
      );
    }
    const scope = userScopes[0];
    const parts = [];
    if (scope.building?.name) parts.push(scope.building.name);
    if (scope.floor?.name) parts.push(scope.floor.name);
    if (scope.department?.name) parts.push(scope.department.name);
    if (scope.rack?.rackName) parts.push(`Rack ${scope.rack.rackName}`);

    if (parts.length === 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 text-xs font-semibold rounded-lg">
          🌍 Full System Access
        </span>
      );
    }

    return (
      <div className="flex flex-wrap items-center gap-1">
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold rounded-lg">
          <MapPin className="w-3.5 h-3.5" />
          {parts.join(' ➔ ')}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Dynamic Header */}
      <div className="bg-gradient-to-r from-neutral-800 to-neutral-900 text-white rounded-xl p-6 shadow-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Users className="w-8 h-8 text-primary" />
              Staff Accounts (Users)
            </h1>
            <p className="text-sm text-neutral-300">
              Create profiles for your staff members, choose their roles, and restrict where they can view physical files.
            </p>
          </div>
          <button
            onClick={() => {
              setEditingId(null);
              setFormData({
                name: '',
                email: '',
                password: '',
                roleId: '',
                isActive: true,
                scope: {
                  buildingId: '',
                  floorId: '',
                  departmentId: '',
                  rackId: '',
                },
              });
              setShowForm(!showForm);
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-white text-neutral-900 rounded-lg font-semibold hover:bg-neutral-100 transition-colors shadow"
          >
            {showForm ? <X className="w-5 h-5 text-red-600" /> : <Plus className="w-5 h-5 text-primary" />}
            {showForm ? 'Close Setup' : 'Add New Staff Member'}
          </button>
        </div>
      </div>

      {/* Educational Layman Help Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-neutral-50 p-4 border border-neutral-200 rounded-xl">
        <div className="flex gap-3">
          <div className="p-2 bg-blue-100 text-blue-800 rounded-lg h-fit">
            <Shield className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-neutral-800">What is a &quot;Role&quot;?</h4>
            <p className="text-xs text-neutral-600 leading-relaxed">
              A **Role** defines what actions a user can take. For example, a **Clerk** can check files out, but only an **Admin** can add or delete staff accounts.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="p-2 bg-purple-100 text-purple-800 rounded-lg h-fit">
            <MapPin className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-neutral-800">What is a &quot;Location Access Scope&quot;?</h4>
            <p className="text-xs text-neutral-600 leading-relaxed">
              It restricts where a user is allowed to look. Restrict a clerk to the &quot;Finance&quot; department, and they will **only** see files located in that specific area. Leave it empty to grant full-facility access.
            </p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-red-800">Operation Error</h4>
            <p className="text-xs text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Add / Edit Form */}
      {showForm && (
        <div className="bg-white border border-neutral-200 rounded-xl shadow-lg overflow-hidden animate-in fade-in duration-200">
          <div className="p-6 border-b border-neutral-100 bg-neutral-50/50">
            <h2 className="text-xl font-bold text-neutral-900">
              {editingId ? '✏️ Edit Staff Member Account' : '👤 Register a New Staff Member'}
            </h2>
            <p className="text-xs text-neutral-600 mt-0.5">
              Fill in their login details and configure their active security boundaries.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-1.5">
                  Full Name *
                </label>
                <div className="relative">
                  <UserCheck className="absolute left-3 top-3 w-5 h-5 text-neutral-400" />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-neutral-800"
                    placeholder="e.g., John Doe"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-1.5">
                  Email Address (used for logging in) *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-5 h-5 text-neutral-400" />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-neutral-800 disabled:bg-neutral-100 disabled:text-neutral-500"
                    placeholder="e.g., john.doe@facility.com"
                    disabled={!!editingId}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-1.5">
                  {editingId ? 'New Password (leave blank to keep current)' : 'Account Password *'}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-neutral-400" />
                  <input
                    type="password"
                    required={!editingId}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-neutral-800"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-1.5">
                  Assigned Security Role *
                </label>
                <select
                  required
                  value={formData.roleId}
                  onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                  className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-neutral-800 bg-white"
                >
                  <option value="">-- Choose Role --</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-1.5">
                  Account Login Status
                </label>
                <select
                  value={formData.isActive ? 'active' : 'inactive'}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'active' })}
                  className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-neutral-800 bg-white"
                >
                  <option value="active">Active (Can Log In)</option>
                  <option value="inactive">Suspended / Deactivated (Blocked)</option>
                </select>
              </div>
            </div>

            {/* Scope Selection Box */}
            <div className="border-t border-neutral-150 pt-5">
              <h3 className="text-md font-bold text-neutral-900 mb-1.5 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-neutral-500" />
                Physical Space Boundaries (Access Restriction)
              </h3>
              <p className="text-xs text-neutral-500 mb-4 max-w-2xl">
                Only select locations below if this employee is restricted to a specific part of the building. Leaving these options unselected grants the employee full access to search and issue files from any rack in the system.
              </p>
              
              <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-5">
                <ScopeSelector
                  value={formData.scope}
                  onChange={(scope) => setFormData({ ...formData, scope })}
                  isOptional={true}
                />
              </div>
            </div>

            {/* Form Action Buttons */}
            <div className="flex gap-2 pt-4 border-t border-neutral-100">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-neutral-900 text-white font-semibold rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50 flex items-center gap-2 shadow"
              >
                {isSubmitting ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : editingId ? (
                  'Update Staff Account'
                ) : (
                  'Create Staff Account'
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setFormData({
                    name: '',
                    email: '',
                    password: '',
                    roleId: '',
                    isActive: true,
                    scope: {
                      buildingId: '',
                      floorId: '',
                      departmentId: '',
                      rackId: '',
                    },
                  });
                }}
                className="px-5 py-2.5 border border-neutral-300 text-neutral-700 font-semibold rounded-lg hover:bg-neutral-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white border border-neutral-200 rounded-xl p-4 flex flex-col sm:flex-row items-center gap-4 shadow-sm">
        <div className="flex-1 w-full flex items-center gap-2 px-4 py-2.5 border border-neutral-300 rounded-lg bg-neutral-50 focus-within:ring-2 focus-within:ring-neutral-900 transition-shadow">
          <Search className="w-5 h-5 text-neutral-400" />
          <input
            type="text"
            placeholder="Search staff members by name or email address..."
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
          Active Accounts: {users.filter(u => u.isActive).length} / {users.length}
        </div>
      </div>

      {/* Users list as a table */}
      {isLoading ? (
        <div className="bg-white border border-neutral-200 rounded-xl p-16 text-center shadow-sm">
          <Loader className="w-8 h-8 animate-spin text-neutral-900 mx-auto mb-3" />
          <p className="text-neutral-600 font-medium">Retrieving staff register...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-xl p-16 text-center shadow-sm">
          <Users className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-neutral-800">No staff members found</h3>
          <p className="text-sm text-neutral-500 max-w-sm mx-auto mt-1">
            Create user accounts for your team so they can login and use the registry workspace.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200">
                  <th className="px-6 py-4.5 text-left text-sm font-semibold text-neutral-600">Employee Details</th>
                  <th className="px-6 py-4.5 text-left text-sm font-semibold text-neutral-600">Security Role</th>
                  <th className="px-6 py-4.5 text-left text-sm font-semibold text-neutral-600">File Access Restriction</th>
                  <th className="px-6 py-4.5 text-left text-sm font-semibold text-neutral-600">Last Activity</th>
                  <th className="px-6 py-4.5 text-left text-sm font-semibold text-neutral-600">Login Status</th>
                  <th className="px-6 py-4.5 text-right text-sm font-semibold text-neutral-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="space-y-0.5">
                        <div className="font-bold text-neutral-800">{user.name}</div>
                        <div className="text-xs text-neutral-500">{user.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-neutral-900 text-white rounded-lg text-xs font-semibold shadow-sm">
                        <Shield className="w-3.5 h-3.5" />
                        {user.role.name}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {formatUserScope(user.userScopes)}
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-600">
                      {user.lastLogin ? (
                        <div className="space-y-0.5">
                          <div className="text-neutral-700 font-medium">
                            {new Date(user.lastLogin).toLocaleDateString()}
                          </div>
                          <div className="text-[10px] text-neutral-400">
                            {new Date(user.lastLogin).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      ) : (
                        <span className="text-neutral-400 text-xs">Never logged in</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold border ${
                          user.isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-neutral-50 text-neutral-500 border-neutral-200'
                        }`}
                      >
                        {user.isActive ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(user)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg border border-neutral-100 hover:border-blue-200 transition-colors"
                          title="Edit Employee profile"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg border border-neutral-100 hover:border-red-200 transition-colors"
                          title="Delete Employee account"
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

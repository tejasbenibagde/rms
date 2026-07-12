'use client';

import { useEffect, useState } from 'react';
import {
  FileText,
  Plus,
  Search,
  Loader,
  Trash2,
  BaggageClaim,
  AlertCircle,
  Filter,
  X,
  Pencil,
  Download,
  Upload,
} from 'lucide-react';
import { convertToIndianFY } from '@/lib/utils/fy';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface File {
  id: string;
  fileNumber: string;
  fileName: string;
  description?: string;
  status: 'AVAILABLE' | 'CHECKED_OUT' | 'ARCHIVED' | 'MISSING';
  financialYear: number;
  department: { id: string; name: string };
  rack: { id: string; rackNumber: string; rackName: string };
  shelf?: { id: string; name: string };
  createdAt: string;
}

interface Department {
  id: string;
  name: string;
}

interface Rack {
  id: string;
  rackNumber: string;
  rackName: string;
}

export default function FilesPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [racks, setRacks] = useState<Rack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [rackFilter, setRackFilter] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    fileNumber: '',
    fileName: '',
    description: '',
    financialYear: new Date().getFullYear(),
    departmentId: '',
    rackId: '',
    shelfId: '',
  });
  const [importMessage, setImportMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [importDetails, setImportDetails] = useState<string[]>([]);

  useEffect(() => {
    fetchDepartmentsAndRacks();
    fetchFiles();
  }, [searchTerm, statusFilter, departmentFilter, rackFilter]);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (importMessage) {
      const timer = setTimeout(() => setImportMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [importMessage]);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  const fetchDepartmentsAndRacks = async () => {
    try {
      const [deptRes, racksRes] = await Promise.all([
        fetch('/api/departments'),
        fetch('/api/racks'),
      ]);

      const deptData = await deptRes.json();
      const racksData = await racksRes.json();

      setDepartments(deptData.departments || []);
      setRacks(racksData.racks || []);
    } catch (error) {
      console.error('Failed to fetch departments/racks:', error);
      toast.error('Failed to load departments/racks');
    }
  };

  const fetchFiles = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status', statusFilter);
      if (departmentFilter) params.append('departmentId', departmentFilter);
      if (rackFilter) params.append('rackId', rackFilter);

      const response = await fetch(`/api/files?${params}`);
      const data = await response.json();
      setFiles(data.files || []);
    } catch (error) {
      console.error('Failed to fetch files:', error);
      toast.error('Failed to load files');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = editingId ? `/api/files/${editingId}` : '/api/files';
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setFormData({
          fileNumber: '',
          fileName: '',
          description: '',
          financialYear: new Date().getFullYear(),
          departmentId: '',
          rackId: '',
          shelfId: '',
        });
        setEditingId(null);
        setShowForm(false);
        await fetchFiles();
        toast.success('File saved successfully');
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to save file');
      }
    } catch (error) {
      console.error('Failed to save file:', error);
      toast.error('Failed to save file');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (file: File) => {
    setFormData({
      fileNumber: file.fileNumber,
      fileName: file.fileName,
      description: file.description || '',
      financialYear: file.financialYear,
      departmentId: file.department.id,
      rackId: file.rack.id,
      shelfId: file.shelf?.id || '',
    });
    setEditingId(file.id);
    setShowForm(true);
  };

  const handleCheckout = async (id: string) => {
    try {
      const response = await fetch(`/api/files/${id}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expectedReturnDate: null,
          remarks: '',
        }),
      });
      if (response.ok) {
        await fetchFiles();
        toast.success('File checked out successfully');
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to check out file');
      }
    } catch (error) {
      console.error('Failed to checkout file:', error);
      toast.error('Failed to check out file');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
      const response = await fetch(`/api/files/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchFiles();
        toast.success('File deleted successfully');
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to delete file');
      }
    } catch (error: any) {
      console.error('Failed to delete file:', error);
      toast.error(error.message || 'Failed to delete file');
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch('/api/files/import-export?template=1');
      if (!response.ok) throw new Error('Template download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `files_import_template_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Template downloaded successfully');
    } catch (error) {
      console.error('Template download failed:', error);
      toast.error('Failed to download template');
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch('/api/files/import-export');
      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `files_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Export successful');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export files');
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setErrorMessage('');
    setImportMessage('');
    setImportDetails([]);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/files/import-export', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        const detailMessages = Array.isArray(data.details)
          ? data.details
          : [data.error || 'Import failed'];
        setImportDetails(detailMessages);
        setErrorMessage(detailMessages.join(' '));
        throw new Error(detailMessages.join(' '));
      }

      const detailMessages = Array.isArray(data.errors) ? data.errors : [];
      const message = `Successfully imported ${data.imported}/${data.total} files${detailMessages.length ? ` with ${detailMessages.length} errors` : ''}`;
      setImportMessage(message);
      setImportDetails(detailMessages);

      await fetchFiles();

      // Clear input
      event.target.value = '';
    } catch (error: any) {
      if (!errorMessage) {
        setErrorMessage(error.message || 'Failed to import files');
      }
    } finally {
      setIsImporting(false);
    }
  };

  const activeFilterCount =
    (searchTerm ? 1 : 0) +
    (statusFilter ? 1 : 0) +
    (departmentFilter ? 1 : 0) +
    (rackFilter ? 1 : 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <FileText className="w-8 h-8" />
          File Management
        </h1>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleDownloadTemplate}
            variant="outline"
            className="flex items-center gap-2"
            title="Download an Excel template for bulk imports"
          >
            <Download className="w-5 h-5" />
            Template
          </Button>
          <Button
            onClick={handleExport}
            title="Export files to Excel"
          >
            <Download className="w-5 h-5" />
            Export
          </Button>
          <label
            className="group/button inline-flex h-8 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-transparent bg-primary bg-clip-padding px-2.5 text-sm font-medium whitespace-nowrap text-primary-foreground transition-all outline-none select-none hover:bg-primary/80 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            {isImporting ? 'Importing...' : 'Import'}
            <input
              id="files-import-input"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImport}
              disabled={isImporting}
              className="hidden"
            />
          </label>
          <Button
            onClick={() => {
              setEditingId(null);
              setFormData({
                fileNumber: '',
                fileName: '',
                description: '',
                financialYear: new Date().getFullYear(),
                departmentId: '',
                rackId: '',
                shelfId: '',
              });
              setShowForm(!showForm);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add File
          </Button>
        </div>
      </div>

      {/* Import Success Message */}
      {importMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <FileText className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-green-800">{importMessage}</p>
            {importDetails.length > 0 && (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-green-700">
                {importDetails.map((detail, index) => (
                  <li key={`${detail}-${index}`}>{detail}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">{errorMessage}</p>
            {importDetails.length > 0 && (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-700">
                {importDetails.map((detail, index) => (
                  <li key={`${detail}-${index}`}>{detail}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Add File Form */}
      {showForm && (
        <div className="bg-white border border-neutral-200 rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-bold text-foreground mb-4">
            {editingId ? 'Edit File' : 'Add New File'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  File Number *
                </label>
                <input
                  type="text"
                  required
                  value={formData.fileNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, fileNumber: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., FR-2024-001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  File Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.fileName}
                  onChange={(e) =>
                    setFormData({ ...formData, fileName: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., Financial Records"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Financial Year * ({convertToIndianFY(formData.financialYear)})
                </label>
                <input
                  type="number"
                  required
                  value={formData.financialYear}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      financialYear: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Department *
                </label>
                <select
                  required
                  value={formData.departmentId}
                  onChange={(e) =>
                    setFormData({ ...formData, departmentId: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select a department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Rack *
                </label>
                <select
                  required
                  value={formData.rackId}
                  onChange={(e) =>
                    setFormData({ ...formData, rackId: e.target.value })
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
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="File description"
                  rows={2}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : editingId ? 'Update File' : 'Add File'}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
                className="px-4 py-2 border border-neutral-300 text-foreground rounded-lg hover:bg-neutral-50 transition-colors"
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Search and Filters */}
      <div className="space-y-4">
        {/* Main Search */}
        <div className="bg-white border border-neutral-200 rounded-lg p-4">
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 px-4 py-2 border border-neutral-300 rounded-lg bg-neutral-50">
              <Search className="w-5 h-5 text-neutral-400" />
              <input
                type="text"
                placeholder="Search by file number, name, or description..."
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
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`px-4 py-2 border rounded-lg transition-colors flex items-center gap-2 ${showAdvancedFilters
                  ? 'bg-primary text-white border-primary'
                  : 'border-neutral-300 text-foreground hover:bg-neutral-50'
                }`}
            >
              <Filter className="w-4 h-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs font-semibold">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <div className="bg-white border border-neutral-200 rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">All Status</option>
                  <option value="AVAILABLE">Available</option>
                  <option value="CHECKED_OUT">Checked Out</option>
                  <option value="ARCHIVED">Archived</option>
                  <option value="MISSING">Missing</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Department</label>
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">All Departments</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Rack</label>
                <select
                  value={rackFilter}
                  onChange={(e) => setRackFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">All Racks</option>
                  {racks.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.rackNumber} - {r.rackName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {activeFilterCount > 0 && (
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('');
                    setDepartmentFilter('');
                    setRackFilter('');
                  }}
                  className="text-sm text-primary hover:underline font-medium"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Files List */}
      {isLoading ? (
        <div className="bg-white border border-neutral-200 rounded-lg p-12 text-center">
          <Loader className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
          <p className="text-neutral-600">Loading files...</p>
        </div>
      ) : files.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-lg p-12 text-center">
          <FileText className="w-12 h-12 text-neutral-400 mx-auto mb-3 opacity-50" />
          <p className="text-neutral-600">
            {searchTerm || statusFilter || departmentFilter || rackFilter
              ? 'No files match your filters.'
              : 'No files found. Create your first file!'}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50">
                <tr className="border-b border-neutral-200">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-600">
                    File Number
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-600">
                    File Name
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-600">
                    Department
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-600">
                    Rack
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-600">
                    Financial Year
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-600">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-neutral-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {files.map((file) => (
                  <tr key={file.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-mono text-neutral-900">
                      {file.fileNumber}
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-900">{file.fileName}</td>
                    <td className="px-6 py-4 text-sm text-neutral-600">
                      {file.department.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-600">
                      {file.rack.rackNumber} - {file.rack.rackName}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-neutral-900">
                      {convertToIndianFY(file.financialYear)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`inline-flex px-2 py-1 rounded text-xs font-semibold ${file.status === 'AVAILABLE'
                            ? 'bg-green-100 text-green-700'
                            : file.status === 'CHECKED_OUT'
                              ? 'bg-blue-100 text-blue-700'
                              : file.status === 'ARCHIVED'
                                ? 'bg-gray-100 text-gray-700'
                                : 'bg-red-100 text-red-700'
                          }`}
                      >
                        {file.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(file)}
                          title="Edit"
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleCheckout(file.id)}
                          title="Checkout"
                          className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        >
                          <BaggageClaim className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(file.id)}
                          title="Delete"
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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

'use client';

import { useEffect, useState } from 'react';
import { Download, Loader, AlertCircle, BarChart3 } from 'lucide-react';

interface Department {
  id: string;
  name: string;
}

export default function ReportsPage() {
  const [reportType, setReportType] = useState<'files' | 'checkout' | 'activity' | 'inventory'>('files');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/departments');
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

  const handleDownload = async () => {
    setIsDownloading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      params.append('type', reportType);

      if (selectedDepartment) {
        params.append('departmentId', selectedDepartment);
      }
      if (startDate) {
        params.append('startDate', startDate);
      }
      if (endDate) {
        params.append('endDate', endDate);
      }

      const response = await fetch(`/api/reports?${params}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate report');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${reportType}_report_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Download error:', error);
      setError(error.message || 'Failed to download report');
    } finally {
      setIsDownloading(false);
    }
  };

  const reportDescriptions: Record<string, { title: string; description: string }> = {
    files: {
      title: 'Files Report',
      description: 'Complete list of all files with details including file number, name, financial year, department, rack location, status, and creation information.',
    },
    checkout: {
      title: 'Checkout Report',
      description: 'Track all file checkouts and returns, including who checked out the file, when, expected return date, actual return date, and current status.',
    },
    activity: {
      title: 'Activity Log Report',
      description: 'Detailed activity history of all file operations including creates, updates, moves, checkouts, and returns with user information.',
    },
    inventory: {
      title: 'Inventory Report',
      description: 'Summary of rack inventory across all locations, showing capacity, used space, and number of files per rack for inventory planning.',
    },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <BarChart3 className="w-8 h-8" />
          Reports & Analytics
        </h1>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="bg-white border border-neutral-200 rounded-lg p-12 text-center">
          <Loader className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
          <p className="text-neutral-600">Loading departments...</p>
        </div>
      ) : (
        <>
          {/* Report Type Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {(Object.entries(reportDescriptions) as Array<[string, any]>).map(([type, info]) => (
              <button
                key={type}
                onClick={() => {
                  setReportType(type as any);
                  setError('');
                }}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  reportType === type
                    ? 'border-primary bg-primary/5'
                    : 'border-neutral-200 hover:border-neutral-300 bg-white'
                }`}
              >
                <h3 className="font-semibold text-foreground mb-2">{info.title}</h3>
                <p className="text-xs text-neutral-600">{info.description}</p>
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="bg-white border border-neutral-200 rounded-lg p-6">
            <h2 className="text-lg font-bold text-foreground mb-4">Filters</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Department (Optional)</label>
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                >
                  <option value="">All Departments</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {(reportType === 'files' || reportType === 'checkout' || reportType === 'activity') && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Start Date (Optional)</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">End Date (Optional)</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Download Button */}
          <div className="flex justify-end">
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 font-medium"
            >
              {isDownloading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Download as Excel
                </>
              )}
            </button>
          </div>

          {/* Report Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Tip:</strong> All financial years are displayed in Indian format (e.g., FY'24-25). Reports include
              comprehensive data with headers optimized for analysis.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

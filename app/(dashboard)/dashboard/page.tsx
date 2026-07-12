'use client';

import { useEffect, useState } from 'react';
import {
  BarChart3,
  Building2,
  FileText,
  Users,
  Layers,
  Loader,
} from 'lucide-react';

interface File {
  id: string;
  fileName: string;
  fileNumber: string;
  status: string;
  department: { name: string };
}

export default function DashboardPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [stats, setStats] = useState({
    totalFiles: 0,
    totalDepartments: 0,
    totalBuildings: 0,
    totalUsers: 0,
    totalFloors: 0,
    totalRacks: 0,
    availableFiles: 0,
    checkedOutFiles: 0,
    archivedFiles: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const [filesRes, buildingsRes, departmentsRes, floorsRes, racksRes] = await Promise.all([
        fetch('/api/files?take=10'),
        fetch('/api/buildings'),
        fetch('/api/departments'),
        fetch('/api/floors'),
        fetch('/api/racks'),
      ]);

      const filesData = await filesRes.json();
      const buildingsData = await buildingsRes.json();
      const departmentsData = await departmentsRes.json();
      const floorsData = await floorsRes.json();
      const racksData = await racksRes.json();

      setFiles(filesData.files || []);

      const totalFiles = filesData.pagination?.total || 0;
      const availableFiles = filesData.files?.filter((f: File) => f.status === 'AVAILABLE').length || 0;
      const checkedOutFiles = filesData.files?.filter((f: File) => f.status === 'CHECKED_OUT').length || 0;
      const archivedFiles = filesData.files?.filter((f: File) => f.status === 'ARCHIVED').length || 0;

      setStats({
        totalFiles,
        totalDepartments: departmentsData.pagination?.total || 0,
        totalBuildings: buildingsData.length || 0,
        totalUsers: 0,
        totalFloors: floorsData.pagination?.total || 0,
        totalRacks: racksData.pagination?.total || 0,
        availableFiles,
        checkedOutFiles,
        archivedFiles,
      });
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const statCards = [
    {
      label: 'Total Files',
      value: stats.totalFiles.toString(),
      icon: FileText,
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      borderColor: 'border-blue-200',
    },
    {
      label: 'Total Departments',
      value: stats.totalDepartments.toString(),
      icon: Building2,
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-600',
      borderColor: 'border-emerald-200',
    },
    {
      label: 'Total Buildings',
      value: stats.totalBuildings.toString(),
      icon: BarChart3,
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
      borderColor: 'border-purple-200',
    },
    {
      label: 'Total Floors',
      value: stats.totalFloors.toString(),
      icon: Layers,
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600',
      borderColor: 'border-orange-200',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-emerald-100 text-emerald-700';
      case 'CHECKED_OUT':
        return 'bg-orange-100 text-orange-700';
      case 'ARCHIVED':
        return 'bg-neutral-100 text-neutral-700';
      case 'MISSING':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-neutral-100 text-neutral-700';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
          <p className="text-neutral-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-neutral-600 mt-2">Welcome to the Rack Management System</p>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className={`${stat.bgColor} border-2 ${stat.borderColor} rounded-xl p-6 hover:shadow-md transition-shadow`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-neutral-600 text-sm font-medium">{stat.label}</p>
                  <p className={`text-3xl font-bold ${stat.textColor} mt-2`}>{stat.value}</p>
                </div>
                <Icon className={`w-8 h-8 ${stat.textColor} opacity-80`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Files Section */}
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Recently Added Files
          </h2>
          <a href="/dashboard/files" className="text-sm text-primary hover:underline font-medium">
            View All
          </a>
        </div>

        {files.length === 0 ? (
          <div className="px-6 py-8 text-center text-neutral-600">
            <p>No files found. Create your first file to get started!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-600">File Name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-600">File Number</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-600">Department</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {files.map((file) => (
                  <tr key={file.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-foreground font-medium">{file.fileName}</td>
                    <td className="px-6 py-4 text-sm text-neutral-600">{file.fileNumber}</td>
                    <td className="px-6 py-4 text-sm text-neutral-600">{file.department.name}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(file.status)}`}>
                        {file.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-neutral-200 rounded-xl p-6">
          <h3 className="font-bold text-foreground mb-4">System Status</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-600">Total Floors</span>
              <span className="text-lg font-semibold text-foreground">{stats.totalFloors}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-600">Total Racks</span>
              <span className="text-lg font-semibold text-foreground">{stats.totalRacks}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-600">Total Departments</span>
              <span className="text-lg font-semibold text-foreground">{stats.totalDepartments}</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-6">
          <h3 className="font-bold text-foreground mb-4">File Status</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-600">Available</span>
              <span className="text-lg font-semibold text-emerald-600">{stats.availableFiles}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-600">Checked Out</span>
              <span className="text-lg font-semibold text-orange-600">{stats.checkedOutFiles}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-600">Archived</span>
              <span className="text-lg font-semibold text-neutral-600">{stats.archivedFiles}</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-6">
          <h3 className="font-bold text-foreground mb-4">Quick Links</h3>
          <div className="space-y-2">
            <a href="/dashboard/files" className="block text-sm text-primary hover:underline font-medium">
              + Add New File
            </a>
            <a href="/dashboard/buildings" className="block text-sm text-primary hover:underline font-medium">
              Manage Buildings
            </a>
            <a href="/dashboard/settings" className="block text-sm text-primary hover:underline font-medium">
              System Settings
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

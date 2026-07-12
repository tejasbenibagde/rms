'use client';

import { useState, useRef } from 'react';
import { Download, Upload, AlertCircle, CheckCircle } from 'lucide-react';

interface ImportExportButtonsProps {
  entityType: 'files' | 'buildings' | 'floors' | 'departments' | 'racks' | 'shelves';
  onImportSuccess?: () => void;
  label?: string;
}

export default function ImportExportButtons({
  entityType,
  onImportSuccess,
  label = 'Import/Export',
}: ImportExportButtonsProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const [importError, setImportError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    try {
      const response = await fetch(`/api/import-export?type=${entityType}`);
      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${entityType}_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      setImportError('Failed to export data');
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportMessage('');
    setImportError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/import-export?type=${entityType}`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Import failed');
      }

      setImportMessage(
        `Successfully imported ${data.imported}/${data.total} records${
          data.errors ? ` with ${data.errors.length} errors` : ''
        }`
      );

      onImportSuccess?.();

      // Clear input
      event.target.value = '';

      // Clear message after 5 seconds
      setTimeout(() => setImportMessage(''), 5000);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Failed to import data';
      setImportError(errMsg);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-2">
      {/* Message Displays */}
      {importMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm font-medium text-green-800">{importMessage}</p>
        </div>
      )}

      {importError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm font-medium text-red-800">{importError}</p>
        </div>
      )}

      {/* Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
          title={`Export ${entityType} to Excel`}
        >
          <Download className="w-4 h-4" />
          Export
        </button>
        <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium cursor-pointer">
          <Upload className="w-4 h-4" />
          {isImporting ? 'Importing...' : 'Import'}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleImport}
            disabled={isImporting}
            className="hidden"
          />
        </label>
      </div>
    </div>
  );
}

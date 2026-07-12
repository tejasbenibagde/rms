'use client';

import { useEffect, useState } from 'react';
import {
  Settings,
  Save,
  Printer,
  Package,
  AlertCircle,
  Loader,
  Check,
} from 'lucide-react';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    companyName: 'Your Company',
    defaultFY: new Date().getFullYear(),
    labelSize: 'A4',
    enableNotifications: true,
    backupFrequency: 'weekly',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');
  const [lastBackup, setLastBackup] = useState('Never');

  useEffect(() => {
    // Load settings from API or localStorage on mount
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/settings');
        if (response.ok) {
          const data = await response.json();
          setSettings(data.settings || settings);
        }
      } catch (err) {
        console.warn('Could not load settings from API, using defaults');
        // Try to load from localStorage as fallback
        if (typeof window !== 'undefined') {
          const saved = localStorage.getItem('rms_settings');
          if (saved) {
            try {
              setSettings(JSON.parse(saved));
            } catch (e) {
              // Keep defaults if parsing fails
            }
          }
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();

    // Set last backup if in browser
    if (typeof window !== 'undefined') {
      const backup = localStorage.getItem('rms_last_backup');
      if (backup) {
        setLastBackup(backup);
      }
    }
  }, []);

  const handleChange = (key: string, value: string | number | boolean) => {
    setSettings(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      // Save to localStorage immediately
      localStorage.setItem('rms_settings', JSON.stringify(settings));

      // Try to save to backend API
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ settings }),
      });

      if (!response.ok) {
        throw new Error('Failed to save settings to server');
      }

      setSuccessMessage('Settings saved successfully!');

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
      console.error('Settings save error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Reset all settings to default values? This action cannot be undone.')) {
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const defaultSettings = {
        companyName: 'Your Company',
        defaultFY: new Date().getFullYear(),
        labelSize: 'A4',
        enableNotifications: true,
        backupFrequency: 'weekly',
      };

      setSettings(defaultSettings);
      localStorage.setItem('rms_settings', JSON.stringify(defaultSettings));

      // Try to reset via API
      try {
        const response = await fetch('/api/settings/reset', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          console.warn('Could not reset settings via API');
        }
      } catch (apiErr) {
        console.warn('API reset failed, using local reset only');
      }

      setSuccessMessage('Settings reset to default!');
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset settings');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <Settings className="w-8 h-8" />
          System Settings
        </h1>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            disabled={isLoading}
            className="px-4 py-2 border border-neutral-300 text-neutral-600 rounded-lg hover:bg-neutral-50 transition-colors"
          >
            Reset to Defaults
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Save className="w-5 h-5" />
            Save Settings
          </button>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm font-medium text-green-800">{successMessage}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      {/* Settings Form */}
      <div className="bg-white border border-neutral-200 rounded-lg p-6 space-y-6">
        <h2 className="text-lg font-bold text-foreground mb-4">General Settings</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Company Name
            </label>
            <input
              type="text"
              value={settings.companyName}
              onChange={(e) => handleChange('companyName', e.target.value)}
              className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Enter your company name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Default Financial Year
            </label>
            <select
              value={settings.defaultFY}
              onChange={(e) => handleChange('defaultFY', parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {[2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030]
                .filter(year => year >= new Date().getFullYear() - 5 && year <= new Date().getFullYear() + 5)
                .map(year => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Label Size
            </label>
            <select
              value={settings.labelSize}
              onChange={(e) => handleChange('labelSize', e.target.value)}
              className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="A4">A4 (210 × 297 mm)</option>
              <option value="A5">A5 (148 × 210 mm)</option>
              <option value="A6">A6 (105 × 148 mm)</option>
              <option value="Letter">Letter (8.5 × 11 in)</option>
              <option value="Legal">Legal (8.5 × 14 in)</option>
              <option value="Custom">Custom Size</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.enableNotifications}
                onChange={(e) => handleChange('enableNotifications', e.target.checked)}
                className="h-4 w-4 text-primary rounded border-gray-300"
              />
              Enable System Notifications
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Backup Frequency
            </label>
            <select
              value={settings.backupFrequency}
              onChange={(e) => handleChange('backupFrequency', e.target.value)}
              className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="manual">Manual Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* System Information */}
      <div className="bg-white border border-neutral-200 rounded-lg p-6">
        <h2 className="text-lg font-bold text-foreground mb-4">System Information</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-neutral-500">Version</p>
              <p className="font-medium text-foreground">1.0.0</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500">Build Date</p>
              <p className="font-medium text-foreground">{new Date().toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500">Database</p>
              <p className="font-medium text-foreground">PostgreSQL via Prisma</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500">Last Backup</p>
              <p className="font-medium text-foreground">
                {lastBackup}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
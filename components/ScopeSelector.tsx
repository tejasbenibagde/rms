'use client';

import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface ScopeData {
  buildings: Array<{ id: string; name: string }>;
  floors: Array<{ id: string; name: string; buildingId: string }>;
  departments: Array<{ id: string; name: string; floorId: string }>;
  racks: Array<{ id: string; rackNumber: string; rackName: string; departmentId: string }>;
}

interface ScopeSelection {
  buildingId?: string;
  floorId?: string;
  departmentId?: string;
  rackId?: string;
}

interface ScopeSelectorProps {
  value: ScopeSelection;
  onChange: (scope: ScopeSelection) => void;
  isOptional?: boolean;
}

export default function ScopeSelector({ value, onChange, isOptional = true }: ScopeSelectorProps) {
  const [scopeData, setScopeData] = useState<ScopeData>({
    buildings: [],
    floors: [],
    departments: [],
    racks: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchScopeData = async () => {
      try {
        const [buildings, floors, departments, racks] = await Promise.all([
          fetch('/api/buildings').then((r) => r.json()),
          fetch('/api/floors').then((r) => r.json()),
          fetch('/api/departments').then((r) => r.json()),
          fetch('/api/racks').then((r) => r.json()),
        ]);

        setScopeData({
          buildings: buildings.buildings || [],
          floors: floors.floors || [],
          departments: departments.departments || [],
          racks: racks.racks || [],
        });
      } catch (error) {
        console.error('Failed to fetch scope data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchScopeData();
  }, []);

  const handleClear = () => {
    onChange({ buildingId: '', floorId: '', departmentId: '', rackId: '' });
  };

  const filteredFloors = value.buildingId
    ? scopeData.floors.filter((f) => f.buildingId === value.buildingId)
    : scopeData.floors;

  const filteredDepartments = value.floorId
    ? scopeData.departments.filter((d) => d.floorId === value.floorId)
    : scopeData.departments;

  const filteredRacks = value.departmentId
    ? scopeData.racks.filter((r) => r.departmentId === value.departmentId)
    : scopeData.racks;

  if (isLoading) {
    return <div className="text-sm text-neutral-500">Loading locations...</div>;
  }

  const hasSelection = value.buildingId || value.floorId || value.departmentId || value.rackId;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Building</label>
          <select
            value={value.buildingId || ''}
            onChange={(e) =>
              onChange({
                ...value,
                buildingId: e.target.value,
                floorId: '',
                departmentId: '',
                rackId: '',
              })
            }
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"
          >
            <option value="">{isOptional ? 'No filter' : 'Select building'}</option>
            {scopeData.buildings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Floor</label>
          <select
            value={value.floorId || ''}
            onChange={(e) =>
              onChange({
                ...value,
                floorId: e.target.value,
                departmentId: '',
                rackId: '',
              })
            }
            disabled={!value.buildingId}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white disabled:bg-neutral-100 disabled:cursor-not-allowed"
          >
            <option value="">{!value.buildingId ? 'Select building first' : isOptional ? 'No filter' : 'Select floor'}</option>
            {filteredFloors.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Department</label>
          <select
            value={value.departmentId || ''}
            onChange={(e) =>
              onChange({
                ...value,
                departmentId: e.target.value,
                rackId: '',
              })
            }
            disabled={!value.floorId}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white disabled:bg-neutral-100 disabled:cursor-not-allowed"
          >
            <option value="">{!value.floorId ? 'Select floor first' : isOptional ? 'No filter' : 'Select department'}</option>
            {filteredDepartments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Rack</label>
          <select
            value={value.rackId || ''}
            onChange={(e) =>
              onChange({
                ...value,
                rackId: e.target.value,
              })
            }
            disabled={!value.departmentId}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white disabled:bg-neutral-100 disabled:cursor-not-allowed"
          >
            <option value="">{!value.departmentId ? 'Select department first' : isOptional ? 'No filter' : 'Select rack'}</option>
            {filteredRacks.map((r) => (
              <option key={r.id} value={r.id}>
                {r.rackNumber} - {r.rackName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isOptional && hasSelection && (
        <button
          type="button"
          onClick={handleClear}
          className="text-sm text-primary hover:underline font-medium"
        >
          Clear scope selection
        </button>
      )}
    </div>
  );
}

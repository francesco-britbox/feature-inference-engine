'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import type { GraphFilters } from '@/lib/types/graph';
import type { FeatureType } from '@/lib/types/feature';

interface ForceGraphControlsProps {
  filters: GraphFilters;
  onChange: (next: GraphFilters) => void;
  counts: { features: number; evidence: number; hierarchyLinks: number; evidenceLinks: number };
}

export default function ForceGraphControls({ filters, onChange, counts }: ForceGraphControlsProps) {
  const toggleFeatureType = (type: FeatureType) => {
    onChange({
      ...filters,
      featureTypes: { ...filters.featureTypes, [type]: !filters.featureTypes[type] },
    });
  };

  const featureTypeOptions: { type: FeatureType; label: string }[] = [
    { type: 'epic', label: 'Epics' },
    { type: 'story', label: 'Stories' },
    { type: 'task', label: 'Tasks' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-6 rounded-lg border bg-white p-3">
      {/* Link toggles */}
      <fieldset className="flex items-center gap-4">
        <legend className="sr-only">Link filters</legend>
        <div className="flex items-center gap-2">
          <Checkbox
            id="hierarchy-links"
            checked={filters.showHierarchyLinks}
            onCheckedChange={() =>
              onChange({ ...filters, showHierarchyLinks: !filters.showHierarchyLinks })
            }
          />
          <Label htmlFor="hierarchy-links" className="text-sm cursor-pointer">
            Hierarchy
          </Label>
          <Badge variant="outline" className="text-xs">{counts.hierarchyLinks}</Badge>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="evidence-links"
            checked={filters.showEvidenceLinks}
            onCheckedChange={() =>
              onChange({ ...filters, showEvidenceLinks: !filters.showEvidenceLinks })
            }
          />
          <Label htmlFor="evidence-links" className="text-sm cursor-pointer">
            Evidence links
          </Label>
          <Badge variant="outline" className="text-xs">{counts.evidenceLinks}</Badge>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="evidence-nodes"
            checked={filters.showEvidenceNodes}
            onCheckedChange={() =>
              onChange({ ...filters, showEvidenceNodes: !filters.showEvidenceNodes })
            }
          />
          <Label htmlFor="evidence-nodes" className="text-sm cursor-pointer">
            Evidence nodes
          </Label>
          <Badge variant="outline" className="text-xs">{counts.evidence}</Badge>
        </div>
      </fieldset>

      {/* Separator */}
      <div className="h-6 w-px bg-border" />

      {/* Feature type toggles */}
      <fieldset className="flex items-center gap-4">
        <legend className="sr-only">Feature type filters</legend>
        {featureTypeOptions.map(({ type, label }) => (
          <div key={type} className="flex items-center gap-2">
            <Checkbox
              id={`type-${type}`}
              checked={filters.featureTypes[type]}
              onCheckedChange={() => toggleFeatureType(type)}
            />
            <Label htmlFor={`type-${type}`} className="text-sm cursor-pointer">
              {label}
            </Label>
          </div>
        ))}
        <Badge variant="secondary" className="text-xs">{counts.features} features</Badge>
      </fieldset>
    </div>
  );
}

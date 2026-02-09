'use client';

import { GRAPH_FEATURE_TYPE_COLORS, GRAPH_RELATIONSHIP_COLORS, GRAPH_COLORS } from '@/lib/constants/ui';

const featureEntries = [
  { label: 'Epic', color: GRAPH_FEATURE_TYPE_COLORS.epic },
  { label: 'Story', color: GRAPH_FEATURE_TYPE_COLORS.story },
  { label: 'Task', color: GRAPH_FEATURE_TYPE_COLORS.task },
];

const linkEntries = [
  { label: 'Hierarchy', color: GRAPH_COLORS.hierarchyLink, dashed: false },
  { label: 'Implements', color: GRAPH_RELATIONSHIP_COLORS.implements, dashed: true },
  { label: 'Supports', color: GRAPH_RELATIONSHIP_COLORS.supports, dashed: true },
  { label: 'Constrains', color: GRAPH_RELATIONSHIP_COLORS.constrains, dashed: true },
  { label: 'Extends', color: GRAPH_RELATIONSHIP_COLORS.extends, dashed: true },
];

export default function ForceGraphLegend() {
  return (
    <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur border rounded-lg p-3 text-xs shadow-sm space-y-2 pointer-events-none">
      {/* Node types */}
      <div>
        <div className="font-semibold text-muted-foreground mb-1">Nodes</div>
        <div className="flex flex-col gap-1">
          {featureEntries.map((e) => (
            <div key={e.label} className="flex items-center gap-2">
              <span
                className="inline-block w-3 h-3 rounded-full shrink-0"
                style={{ background: e.color }}
              />
              <span>{e.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <span
              className="inline-block w-3 h-3 shrink-0"
              style={{
                background: GRAPH_COLORS.evidenceNode,
                transform: 'rotate(45deg)',
              }}
            />
            <span>Evidence</span>
          </div>
        </div>
      </div>

      {/* Link types */}
      <div>
        <div className="font-semibold text-muted-foreground mb-1">Links</div>
        <div className="flex flex-col gap-1">
          {linkEntries.map((e) => (
            <div key={e.label} className="flex items-center gap-2">
              <svg width="20" height="4" className="shrink-0">
                <line
                  x1={0}
                  y1={2}
                  x2={20}
                  y2={2}
                  stroke={e.color}
                  strokeWidth={2}
                  strokeDasharray={e.dashed ? '4,2' : 'none'}
                />
              </svg>
              <span>{e.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="text-muted-foreground">Circle size = confidence</div>
    </div>
  );
}

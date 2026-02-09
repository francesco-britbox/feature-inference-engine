'use client';

import { useRef, useEffect, useCallback } from 'react';
import * as d3 from 'd3';
import { useRouter } from 'next/navigation';
import type { GraphData, GraphNode, GraphLink, GraphFeatureNode, GraphEvidenceNode, GraphFilters } from '@/lib/types/graph';
import {
  GRAPH_FEATURE_TYPE_COLORS,
  GRAPH_RELATIONSHIP_COLORS,
  GRAPH_COLORS,
} from '@/lib/constants/ui';

interface ForceGraphProps {
  data: GraphData;
  filters: GraphFilters;
}

/** D3 simulation node with position fields */
type SimNode = GraphNode & {
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
};

/** D3 simulation link with resolved node references */
interface SimLink {
  source: SimNode | string;
  target: SimNode | string;
  kind: 'hierarchy' | 'evidence';
  relationshipType?: string;
  strength?: number;
}

function featureRadius(confidence: number): number {
  return 8 + confidence * 20; // 8-28px
}

function isFeatureNode(n: SimNode): n is GraphFeatureNode & { x?: number; y?: number; fx?: number | null; fy?: number | null } {
  return n.kind === 'feature';
}

function isEvidenceNode(n: SimNode): n is GraphEvidenceNode & { x?: number; y?: number; fx?: number | null; fy?: number | null } {
  return n.kind === 'evidence';
}

export default function ForceGraph({ data, filters }: ForceGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const router = useRouter();

  const navigate = useCallback(
    (id: string) => router.push(`/features/${id}`),
    [router]
  );

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const width = svg.clientWidth || 900;
    const height = svg.clientHeight || 600;

    // --- Filter data ---
    const visibleFeatureTypes = new Set(
      (Object.entries(filters.featureTypes) as [string, boolean][])
        .filter(([, v]) => v)
        .map(([k]) => k)
    );

    const filteredNodes: SimNode[] = (data.nodes as SimNode[]).filter((n) => {
      if (isFeatureNode(n)) return visibleFeatureTypes.has(n.featureType);
      if (isEvidenceNode(n)) return filters.showEvidenceNodes;
      return false;
    });

    const nodeIds = new Set(filteredNodes.map((n) => n.id));

    const filteredLinks: SimLink[] = (data.links as GraphLink[])
      .filter((l) => {
        if (l.kind === 'hierarchy' && !filters.showHierarchyLinks) return false;
        if (l.kind === 'evidence' && !filters.showEvidenceLinks) return false;
        return nodeIds.has(l.source) && nodeIds.has(l.target);
      })
      .map((l) => ({ ...l }));

    // --- Clear previous render ---
    const root = d3.select(svg);
    root.selectAll('*').remove();

    if (filteredNodes.length === 0) return;

    // --- Zoom container ---
    const g = root.append('g');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        g.attr('transform', event.transform.toString());
      });

    root.call(zoom);

    // --- Defs for arrow markers ---
    const defs = root.append('defs');
    defs
      .append('marker')
      .attr('id', 'arrow-hierarchy')
      .attr('viewBox', '0 0 10 10')
      .attr('refX', 20)
      .attr('refY', 5)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M 0 0 L 10 5 L 0 10 z')
      .attr('fill', GRAPH_COLORS.hierarchyLink);

    // --- Simulation ---
    const simulation = d3
      .forceSimulation<SimNode>(filteredNodes)
      .force(
        'link',
        d3.forceLink<SimNode, SimLink>(filteredLinks)
          .id((d) => d.id)
          .distance((l) => (l.kind === 'hierarchy' ? 120 : 80))
      )
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide<SimNode>().radius((d) =>
        isFeatureNode(d) ? featureRadius(d.confidenceScore) + 4 : 10
      ));

    // --- Links ---
    const link = g
      .append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(filteredLinks)
      .join('line')
      .attr('stroke', (d) => {
        if (d.kind === 'hierarchy') return GRAPH_COLORS.hierarchyLink;
        return GRAPH_RELATIONSHIP_COLORS[d.relationshipType ?? 'supports'] ?? GRAPH_COLORS.hierarchyLink;
      })
      .attr('stroke-width', (d) => {
        if (d.kind === 'hierarchy') return 2;
        return 1 + (d.strength ?? 0) * 3;
      })
      .attr('stroke-dasharray', (d) => (d.kind === 'evidence' ? '5,3' : 'none'))
      .attr('marker-end', (d) => (d.kind === 'hierarchy' ? 'url(#arrow-hierarchy)' : ''))
      .attr('opacity', 0.6);

    // --- Nodes ---
    const node = g
      .append('g')
      .attr('class', 'nodes')
      .selectAll<SVGGElement, SimNode>('g')
      .data(filteredNodes)
      .join('g')
      .attr('cursor', (d) => (isFeatureNode(d) ? 'pointer' : 'default'))
      .on('click', (_event, d) => {
        if (isFeatureNode(d)) navigate(d.id);
      });

    // Feature nodes: circles
    node
      .filter((d) => isFeatureNode(d))
      .append('circle')
      .attr('r', (d) => featureRadius((d as GraphFeatureNode).confidenceScore))
      .attr('fill', (d) => GRAPH_FEATURE_TYPE_COLORS[(d as GraphFeatureNode).featureType] ?? '#6b7280')
      .attr('stroke', GRAPH_COLORS.nodeStroke)
      .attr('stroke-width', 2);

    // Evidence nodes: small diamonds (rotated square)
    node
      .filter((d) => isEvidenceNode(d))
      .append('rect')
      .attr('width', 10)
      .attr('height', 10)
      .attr('x', -5)
      .attr('y', -5)
      .attr('transform', 'rotate(45)')
      .attr('fill', GRAPH_COLORS.evidenceNode)
      .attr('stroke', GRAPH_COLORS.nodeStroke)
      .attr('stroke-width', 1);

    // Labels for feature nodes
    node
      .filter((d) => isFeatureNode(d))
      .append('text')
      .text((d) => {
        const f = d as GraphFeatureNode;
        return f.name.length > 24 ? f.name.slice(0, 22) + '...' : f.name;
      })
      .attr('dy', (d) => featureRadius((d as GraphFeatureNode).confidenceScore) + 14)
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .attr('fill', GRAPH_COLORS.labelColor)
      .attr('pointer-events', 'none');

    // --- Tooltip ---
    const tooltip = d3
      .select('body')
      .append('div')
      .attr('class', 'force-graph-tooltip')
      .style('position', 'absolute')
      .style('padding', '6px 10px')
      .style('background', GRAPH_COLORS.tooltipBg)
      .style('color', GRAPH_COLORS.tooltipText)
      .style('border-radius', '6px')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('opacity', 0)
      .style('z-index', '50')
      .style('max-width', '260px')
      .style('white-space', 'pre-wrap');

    node
      .on('mouseenter', (event: MouseEvent, d: SimNode) => {
        let html = '';
        if (isFeatureNode(d)) {
          html = `<strong>${d.name}</strong>\nType: ${d.featureType}\nConfidence: ${Math.round(d.confidenceScore * 100)}%\nStatus: ${d.status}`;
        } else if (isEvidenceNode(d)) {
          html = `<strong>Evidence (${d.evidenceType})</strong>\n${d.content}`;
        }
        tooltip
          .html(html)
          .style('left', event.pageX + 12 + 'px')
          .style('top', event.pageY - 10 + 'px')
          .transition()
          .duration(150)
          .style('opacity', 1);
      })
      .on('mousemove', (event: MouseEvent) => {
        tooltip
          .style('left', event.pageX + 12 + 'px')
          .style('top', event.pageY - 10 + 'px');
      })
      .on('mouseleave', () => {
        tooltip.transition().duration(150).style('opacity', 0);
      });

    // --- Drag ---
    const drag = d3
      .drag<SVGGElement, SimNode>()
      .on('start', (event: d3.D3DragEvent<SVGGElement, SimNode, SimNode>, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event: d3.D3DragEvent<SVGGElement, SimNode, SimNode>, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event: d3.D3DragEvent<SVGGElement, SimNode, SimNode>, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    node.call(drag);

    // --- Tick ---
    simulation.on('tick', () => {
      link
        .attr('x1', (d) => ((d.source as SimNode).x ?? 0))
        .attr('y1', (d) => ((d.source as SimNode).y ?? 0))
        .attr('x2', (d) => ((d.target as SimNode).x ?? 0))
        .attr('y2', (d) => ((d.target as SimNode).y ?? 0));

      node.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    // Cleanup
    return () => {
      simulation.stop();
      tooltip.remove();
    };
  }, [data, filters, navigate]);

  return (
    <svg
      ref={svgRef}
      className="w-full h-full"
      style={{ minHeight: 500 }}
    />
  );
}

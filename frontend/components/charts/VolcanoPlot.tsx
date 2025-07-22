import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface VolcanoData {
  gene: string;
  log2FoldChange: number;
  pValue: number;
  adjustedPValue: number;
  significance: 'up' | 'down' | 'ns';
  geneSymbol?: string;
}

interface VolcanoPlotProps {
  data: VolcanoData[];
  width?: number;
  height?: number;
  pValueThreshold?: number;
  foldChangeThreshold?: number;
  onGeneClick?: (gene: VolcanoData) => void;
  highlightGenes?: string[];
  theme?: 'light' | 'dark';
}

export const VolcanoPlot: React.FC<VolcanoPlotProps> = ({
  data,
  width = 800,
  height = 600,
  pValueThreshold = 0.05,
  foldChangeThreshold = 1,
  onGeneClick,
  highlightGenes = [],
  theme = 'light'
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{
    show: boolean;
    x: number;
    y: number;
    content: VolcanoData | null;
  }>({
    show: false,
    x: 0,
    y: 0,
    content: null
  });

  const colors = {
    light: {
      up: '#E74C3C',
      down: '#3498DB', 
      ns: '#7F7F7F',
      highlight: '#F39C12',
      background: '#FFFFFF',
      text: '#2C3E50',
      grid: '#ECF0F1',
      threshold: '#BDC3C7'
    },
    dark: {
      up: '#FF6B6B',
      down: '#4ECDC4',
      ns: '#95A5A6',
      highlight: '#F1C40F',
      background: '#2C3E50',
      text: '#ECF0F1',
      grid: '#34495E',
      threshold: '#7F8C8D'
    }
  };

  const themeColors = colors[theme];

  useEffect(() => {
    if (!data || data.length === 0 || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 40, right: 40, bottom: 60, left: 80 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create scales
    const xExtent = d3.extent(data, d => d.log2FoldChange) as [number, number];
    const xPadding = (xExtent[1] - xExtent[0]) * 0.1;
    const xScale = d3.scaleLinear()
      .domain([xExtent[0] - xPadding, xExtent[1] + xPadding])
      .range([0, innerWidth]);

    const maxNegLog = d3.max(data, d => -Math.log10(Math.max(d.pValue, 1e-300))) || 10;
    const yScale = d3.scaleLinear()
      .domain([0, maxNegLog * 1.1])
      .range([innerHeight, 0]);

    // Create main group
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Add background
    g.append('rect')
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', themeColors.background)
      .attr('opacity', 0);

    // Add grid lines
    const xAxis = d3.axisBottom(xScale)
      .tickSize(-innerHeight)
      .tickFormat(() => '');
    
    const yAxis = d3.axisLeft(yScale)
      .tickSize(-innerWidth)
      .tickFormat(() => '');

    g.append('g')
      .attr('class', 'grid')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .selectAll('line')
      .attr('stroke', themeColors.grid)
      .attr('stroke-width', 0.5);

    g.append('g')
      .attr('class', 'grid')
      .call(yAxis)
      .selectAll('line')
      .attr('stroke', themeColors.grid)
      .attr('stroke-width', 0.5);

    // Add threshold lines
    // Horizontal line for p-value threshold
    const pThresholdY = yScale(-Math.log10(pValueThreshold));
    g.append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', pThresholdY)
      .attr('y2', pThresholdY)
      .attr('stroke', themeColors.threshold)
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '5,5');

    // Vertical lines for fold change thresholds
    g.append('line')
      .attr('x1', xScale(-foldChangeThreshold))
      .attr('x2', xScale(-foldChangeThreshold))
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', themeColors.threshold)
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '5,5');

    g.append('line')
      .attr('x1', xScale(foldChangeThreshold))
      .attr('x2', xScale(foldChangeThreshold))
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', themeColors.threshold)
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '5,5');

    // Add data points
    const circles = g.selectAll('.point')
      .data(data)
      .enter().append('circle')
      .attr('class', 'point')
      .attr('cx', d => xScale(d.log2FoldChange))
      .attr('cy', d => yScale(-Math.log10(Math.max(d.pValue, 1e-300))))
      .attr('r', d => {
        const isHighlighted = highlightGenes.includes(d.gene) || highlightGenes.includes(d.geneSymbol || '');
        return isHighlighted ? 5 : 3;
      })
      .attr('fill', d => {
        const isHighlighted = highlightGenes.includes(d.gene) || highlightGenes.includes(d.geneSymbol || '');
        if (isHighlighted) return themeColors.highlight;
        
        switch (d.significance) {
          case 'up': return themeColors.up;
          case 'down': return themeColors.down;
          default: return themeColors.ns;
        }
      })
      .attr('stroke', themeColors.background)
      .attr('stroke-width', 0.5)
      .attr('opacity', 0.7)
      .style('cursor', 'pointer');

    // Add interactivity
    circles
      .on('mouseover', function(event, d) {
        d3.select(this)
          .attr('opacity', 1)
          .attr('r', 5);

        const rect = svgRef.current!.getBoundingClientRect();
        setTooltip({
          show: true,
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
          content: d
        });
      })
      .on('mouseout', function(event, d) {
        const isHighlighted = highlightGenes.includes(d.gene) || highlightGenes.includes(d.geneSymbol || '');
        d3.select(this)
          .attr('opacity', 0.7)
          .attr('r', isHighlighted ? 5 : 3);

        setTooltip(prev => ({ ...prev, show: false }));
      })
      .on('click', (event, d) => {
        if (onGeneClick) {
          onGeneClick(d);
        }
      });

    // Add labels for significant genes
    const labelData = data
      .filter(d => d.significance !== 'ns')
      .sort((a, b) => a.adjustedPValue - b.adjustedPValue)
      .slice(0, 10); // Show top 10 genes

    g.selectAll('.gene-label')
      .data(labelData)
      .enter().append('text')
      .attr('class', 'gene-label')
      .attr('x', d => xScale(d.log2FoldChange))
      .attr('y', d => yScale(-Math.log10(Math.max(d.pValue, 1e-300))) - 8)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('font-family', 'Arial, sans-serif')
      .attr('fill', themeColors.text)
      .attr('opacity', 0.8)
      .text(d => d.geneSymbol || d.gene.split('.')[0]);

    // Add axes
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale))
      .selectAll('text')
      .attr('fill', themeColors.text);

    g.append('g')
      .call(d3.axisLeft(yScale))
      .selectAll('text')
      .attr('fill', themeColors.text);

    // Add axis labels
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left)
      .attr('x', 0 - (innerHeight / 2))
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .style('font-family', 'Arial, sans-serif')
      .style('font-size', '12px')
      .attr('fill', themeColors.text)
      .text('-log10(p-value)');

    g.append('text')
      .attr('transform', `translate(${innerWidth / 2}, ${innerHeight + margin.bottom - 10})`)
      .style('text-anchor', 'middle')
      .style('font-family', 'Arial, sans-serif')
      .style('font-size', '12px')
      .attr('fill', themeColors.text)
      .text('log2(fold change)');

    // Add title
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', margin.top / 2)
      .attr('text-anchor', 'middle')
      .style('font-family', 'Arial, sans-serif')
      .style('font-size', '14px')
      .style('font-weight', 'bold')
      .attr('fill', themeColors.text)
      .text('Volcano Plot');

    // Add legend
    const legend = svg.append('g')
      .attr('transform', `translate(${width - 150}, 50)`);

    const legendData = [
      { label: 'Upregulated', color: themeColors.up },
      { label: 'Downregulated', color: themeColors.down },
      { label: 'Not significant', color: themeColors.ns }
    ];

    legend.selectAll('.legend-item')
      .data(legendData)
      .enter().append('g')
      .attr('class', 'legend-item')
      .attr('transform', (d, i) => `translate(0, ${i * 20})`)
      .each(function(d) {
        const g = d3.select(this);
        g.append('circle')
          .attr('r', 4)
          .attr('fill', d.color);
        g.append('text')
          .attr('x', 10)
          .attr('y', 4)
          .style('font-family', 'Arial, sans-serif')
          .style('font-size', '10px')
          .attr('fill', themeColors.text)
          .text(d.label);
      });

  }, [data, width, height, pValueThreshold, foldChangeThreshold, highlightGenes, theme]);

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        style={{ backgroundColor: themeColors.background }}
      />
      
      {/* Tooltip */}
      {tooltip.show && tooltip.content && (
        <div
          className="absolute z-10 px-3 py-2 bg-gray-900 text-white text-xs rounded shadow-lg pointer-events-none"
          style={{
            left: tooltip.x + 10,
            top: tooltip.y - 10,
          }}
        >
          <div className="font-semibold">
            {tooltip.content.geneSymbol || tooltip.content.gene}
          </div>
          <div>log2FC: {tooltip.content.log2FoldChange.toFixed(3)}</div>
          <div>p-value: {tooltip.content.pValue.toExponential(2)}</div>
          <div>adj. p-value: {tooltip.content.adjustedPValue.toExponential(2)}</div>
        </div>
      )}
    </div>
  );
};
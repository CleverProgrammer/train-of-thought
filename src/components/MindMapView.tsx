"use client";

import { useRef, useEffect, useCallback } from "react";
import { buildTree } from "@/lib/buildTree";
import type { MindMapData } from "@/lib/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MarkmapInstance = any;

interface MindMapViewProps {
  mindmap: MindMapData;
}

export default function MindMapView({
  mindmap,
}: MindMapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const mmRef = useRef<MarkmapInstance | null>(null);
  const initedRef = useRef(false);

  /**
   * Resize the SVG to match its container's pixel dimensions.
   * D3 zoom needs explicit width/height attributes — CSS % won't work.
   */
  const syncSize = useCallback(() => {
    if (!containerRef.current || !svgRef.current) return;
    const { width, height } = containerRef.current.getBoundingClientRect();
    svgRef.current.setAttribute("width", String(width));
    svgRef.current.setAttribute("height", String(height));
  }, []);

  // Create the SVG + Markmap instance once
  useEffect(() => {
    if (initedRef.current || !containerRef.current) return;
    initedRef.current = true;

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    containerRef.current.appendChild(svg);
    svgRef.current = svg;

    // Set initial pixel dimensions
    const { width, height } = containerRef.current.getBoundingClientRect();
    svg.setAttribute("width", String(width));
    svg.setAttribute("height", String(height));
    svg.style.display = "block";

    // Inject styles directly into the SVG to force bright text on dark bg.
    // This beats markmap's inline styles.
    const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
    style.textContent = `
      foreignObject div, foreignObject span, foreignObject strong, foreignObject em,
      text, tspan {
        color: #f3f4f6 !important;
        fill: #f3f4f6 !important;
      }
      path { opacity: 0.7; }
    `;
    svg.appendChild(style);

    // Keep dimensions in sync on resize
    const observer = new ResizeObserver(() => syncSize());
    observer.observe(containerRef.current);

    // Create markmap
    import("markmap-view").then(({ Markmap }) => {
      const tree = buildTree(mindmap, "");
      mmRef.current = Markmap.create(svg, {
        autoFit: true,
        duration: 300,
        paddingX: 20,
        initialExpandLevel: -1,
      }, tree);
    });

    return () => observer.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update data when mindmap or transcript changes
  useEffect(() => {
    if (!mmRef.current) return;
    const tree = buildTree(mindmap, "");
    mmRef.current.setData(tree);
    mmRef.current.fit();
  }, [mindmap]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
    />
  );
}

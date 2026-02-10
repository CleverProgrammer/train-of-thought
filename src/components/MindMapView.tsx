"use client";

import { useRef, useEffect } from "react";
import { buildTree } from "@/lib/buildTree";

/**
 * Renders a markmap mindmap that updates in real time
 * as new transcript segments arrive.
 *
 * Uses dynamic import to avoid SSR issues (markmap needs the DOM).
 */

// Keep the Markmap instance type loose since we dynamically import it.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MarkmapInstance = any;

interface MindMapViewProps {
  segments: string[];
  currentTranscript: string;
}

export default function MindMapView({
  segments,
  currentTranscript,
}: MindMapViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const mmRef = useRef<MarkmapInstance | null>(null);

  useEffect(() => {
    async function updateMap() {
      // Dynamic import — only runs in the browser
      const { Markmap } = await import("markmap-view");

      if (!svgRef.current) return;

      const tree = buildTree(segments, currentTranscript);

      if (!mmRef.current) {
        // First render: create the Markmap instance
        svgRef.current.innerHTML = "";
        mmRef.current = Markmap.create(svgRef.current, {
          autoFit: true,
          duration: 300,
          paddingX: 16,
          initialExpandLevel: -1, // expand all
        }, tree);
      } else {
        // Subsequent renders: update the data
        mmRef.current.setData(tree);
        mmRef.current.fit();
      }
    }

    updateMap();
  }, [segments, currentTranscript]);

  return (
    <svg
      ref={svgRef}
      className="h-full w-full"
    />
  );
}

"use client";

import dynamic from "next/dynamic";

const Orb = dynamic(() => import("ui/orb"), {
  ssr: false,
});

export function OrbBackground() {
  return (
    <>
      {/* Fixed invisible container that never moves */}
      <div 
        className="fixed inset-0 z-10 pointer-events-none"
        style={{ 
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          clipPath: 'inset(0 0 0 280px)', // Clip left 280px to avoid sidebar
        }}
      >
        <div className="w-full h-full pointer-events-auto">
          <Orb 
            hoverIntensity={0.3}
            rotateOnHover={true}
            hue={120}
            forceHoverState={false}
            className="bg-transparent"
          />
        </div>
      </div>
      
      {/* Gradient overlays with same clipping */}
      <div 
        className="fixed inset-0 z-10 pointer-events-none"
        style={{ 
          clipPath: 'inset(0 0 0 280px)',
        }}
      >
        <div className="w-full h-full bg-gradient-to-t from-background to-50% to-transparent" />
      </div>
      <div 
        className="fixed inset-0 z-10 pointer-events-none"
        style={{ 
          clipPath: 'inset(0 0 0 280px)',
        }}
      >
        <div className="w-full h-full bg-gradient-to-l from-background to-20% to-transparent" />
      </div>
      <div 
        className="fixed inset-0 z-10 pointer-events-none"
        style={{ 
          clipPath: 'inset(0 0 0 280px)',
        }}
      >
        <div className="w-full h-full bg-gradient-to-r from-background to-20% to-transparent" />
      </div>
    </>
  );
}
"use client";

import { Ripple } from "@/components/magicui/ripple";

export function RippleBackground() {
  return (
    <>
      {/* Fixed ripple container - positioned in main content area only */}
      <div
        className="fixed z-10 pointer-events-none"
        style={{
          position: "fixed",
          top: 0,
          left: "5vw", // Always start after sidebar (5% width when collapsed)
          right: 0,
          bottom: 0,
        }}
      >
        <div className="w-full h-full flex items-center justify-center">
          <Ripple
            mainCircleSize={300}
            mainCircleOpacity={0.15}
            numCircles={8}
            className="[mask-image:none] bg-transparent"
          />
        </div>
      </div>
    </>
  );
}

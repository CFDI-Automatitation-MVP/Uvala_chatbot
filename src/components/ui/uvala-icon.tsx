import { SVGProps } from "react";

export function UvalaIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <defs>
        <linearGradient id="uvalaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="50%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
      
      {/* Mountain peaks representing Fuji */}
      <path
        d="M12 2L20 14H16L12 8L8 14H4L12 2Z"
        fill="url(#uvalaGradient)"
        opacity="0.8"
      />
      
      {/* Abstract wave/flow lines */}
      <path
        d="M3 18C5 16 7 16 9 18C11 20 13 20 15 18C17 16 19 16 21 18"
        stroke="url(#uvalaGradient)"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      
      {/* Accent dots */}
      <circle cx="12" cy="6" r="1.5" fill="url(#uvalaGradient)" />
      <circle cx="6" cy="20" r="1" fill="url(#uvalaGradient)" opacity="0.6" />
      <circle cx="18" cy="20" r="1" fill="url(#uvalaGradient)" opacity="0.6" />
    </svg>
  );
}
"use client";

export function LoadingState() {
  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col items-center justify-center bg-background">
      <div className="space-y-6 text-center">
        {/* Animated Circle */}
        <div className="relative mx-auto h-16 w-16">
          <div className="absolute inset-0 rounded-full border-4 border-white/10" />
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-green-500 border-r-green-400" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Loading Presentation</h2>
          <p className="text-muted-foreground">Getting your slides ready...</p>
        </div>
      </div>
    </div>
  );
}

import TanstackQueryProvider from "@/providers/tanstack-query-provider";
import PresentationHeader from "@/components/presentation/presentation-page/PresentationHeader";
import type React from "react";

export default function PresentationViewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TanstackQueryProvider>
      {/* Completely isolated layout for presentation view - no chat sidebar */}
      <div className="fixed inset-0 z-[100] flex h-screen w-screen flex-col bg-background supports-[(height:100dvh)]:h-[100dvh]">
        <PresentationHeader />
        <main className="relative flex flex-1 overflow-hidden">{children}</main>
      </div>
    </TanstackQueryProvider>
  );
}

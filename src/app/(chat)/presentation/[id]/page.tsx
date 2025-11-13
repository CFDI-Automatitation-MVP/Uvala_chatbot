"use client";

import PresentationPage from "@/components/presentation/presentation-page/Main";
import TanstackQueryProvider from "@/providers/tanstack-query-provider";

export default function Page() {
  return (
    <TanstackQueryProvider>
      <PresentationPage />
    </TanstackQueryProvider>
  );
}

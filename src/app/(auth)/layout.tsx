// Commented out for later use - left side animations
// import { Think } from "ui/think";
// import { getTranslations } from "next-intl/server";
// import { FlipWords } from "ui/flip-words";
// import { BackgroundPaths } from "ui/background-paths";

export default async function AuthLayout({
  children,
}: { children: React.ReactNode }) {
  // const t = await getTranslations("Auth.Intro");
  return (
    <main className="relative w-full h-screen overflow-hidden">
      {/* Background video container */}
      <div className="absolute inset-0 w-full h-full bg-black">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/auth/uvala-sign-invideo.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-black/30 z-10" /> {/* Overlay for better contrast */}
      </div>

      {/* Content container */}
      <div className="relative z-20 w-full h-full flex items-center justify-center p-6">
        {children}
      </div>

      {/* Commented out - Left side with animations for later use */}
      {/*
      <div className="flex min-h-screen w-full">
        <div className="hidden lg:flex lg:w-1/2 bg-muted border-r flex-col p-18 relative">
          <div className="absolute inset-0 w-full h-full">
            <BackgroundPaths />
          </div>
          <h1 className="text-xl font-semibold flex items-center gap-3 animate-in fade-in duration-1000">
            <Think />
            <span>uvala</span>
          </h1>
          <div className="flex-1" />
          <FlipWords
            words={[t("description")]}
            className=" mb-4 text-muted-foreground"
          />
        </div>

        <div className="w-full lg:w-1/2 p-6">{children}</div>
      </div>
      */}
    </main>
  );
}

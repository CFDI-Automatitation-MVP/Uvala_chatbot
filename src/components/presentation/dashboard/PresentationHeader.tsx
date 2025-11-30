import Image from "next/image";

export function PresentationHeader() {
  return (
    <div className="space-y-3 text-center">
      <div className="flex items-center justify-center gap-3">
        {/* Logo that adapts to dark/light mode */}
        <Image
          src="/uvala-black-log.svg"
          alt="Uvala Logo"
          width={32}
          height={32}
          className="dark:hidden"
        />
        <Image
          src="/uvala-white-log.svg"
          alt="Uvala Logo"
          width={32}
          height={32}
          className="hidden dark:block"
        />
        <span className="text-4xl font-light text-foreground">
          Presentations
        </span>
      </div>
      <p className="text-base text-muted-foreground/80 font-normal max-w-xl mx-auto">
        Create beautiful presentations in seconds
      </p>
    </div>
  );
}

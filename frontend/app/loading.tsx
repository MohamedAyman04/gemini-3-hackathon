import Image from "next/image";

export default function Loading() {
  return (
    <div className="fixed inset-0 min-h-screen flex items-center justify-center bg-background z-[9999]">
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          <div className="w-24 h-24 border-8 border-primary/10 border-t-primary rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Image
              src="/vibecheck.svg"
              alt="VibeCheck"
              width={48}
              height={48}
              className="animate-pulse"
            />
          </div>
        </div>
        <p className="text-midnight font-black uppercase tracking-[0.2em] text-xs animate-pulse">
          VibeCheck
        </p>
      </div>
    </div>
  );
}

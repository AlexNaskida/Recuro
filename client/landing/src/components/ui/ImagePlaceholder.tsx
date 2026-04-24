import { existsSync } from "node:fs";
import { join } from "node:path";
import Image from "next/image";
import { cn } from "@/lib/cn";

type ImagePlaceholderProps = {
  tint?: "teal" | "purple" | "blue" | "neutral";
  imageSrc: string;
  imageAlt: string;
  className?: string;
};

export default function ImagePlaceholder({
  imageSrc,
  imageAlt,
  className,
}: ImagePlaceholderProps) {
  const filePath = join(process.cwd(), "public", imageSrc.replace(/^\//, ""));
  const hasImage = existsSync(filePath);

  return (
    <div
      className={cn(
        "relative min-h-[320px] overflow-hidden rounded-2xl border border-border/70 bg-surface shadow-[0_28px_90px_-44px_rgba(15,23,42,0.55)]",
        className,
      )}
    >
      {/* src: {imageSrc} */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#fcfcfa] via-white to-[#f7f7f4]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(15,23,42,0.02),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(15,23,42,0.015),transparent_34%)]" />
      <div className="absolute inset-x-0 top-0 z-20 h-12 border-b border-border/35 bg-white/90 backdrop-blur-sm">
        <div className="flex h-full items-center gap-2 px-5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#f87171]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#fbbf24]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#34d399]" />
        </div>
      </div>
      {hasImage ? (
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover object-top opacity-[0.12] saturate-0 contrast-75 brightness-200"
        />
      ) : (
        <div className="relative z-10 flex h-full min-h-[320px] items-center justify-center px-6 text-center text-sm text-text-tertiary">
          {imageAlt}
        </div>
      )}
      <div className="absolute inset-0 z-10 bg-white/60" aria-hidden="true" />
      <div className="absolute inset-x-5 bottom-5 z-20 rounded-[16px] border border-border/55 bg-white/92 p-3 backdrop-blur-md">
        <div className="flex items-center justify-between gap-3">
          <div className="h-2 w-24 rounded-full bg-accent/10" />
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">
            <span className="h-2 w-2 rounded-full bg-accent/60" />
            Live preview
          </div>
        </div>
      </div>
    </div>
  );
}

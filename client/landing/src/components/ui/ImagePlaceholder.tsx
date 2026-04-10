import { existsSync } from "node:fs";
import { join } from "node:path";
import Image from "next/image";
import { cn } from "@/lib/cn";

type ImagePlaceholderProps = {
  tint: "teal" | "purple" | "blue" | "neutral";
  imageSrc: string;
  imageAlt: string;
  className?: string;
};

const tintClasses: Record<ImagePlaceholderProps["tint"], string> = {
  teal: "from-[#dff7f4] via-[#f7fffd] to-[#eefbf8]",
  purple: "from-[#ead8ff] via-[#f6eeff] to-[#efe3ff]",
  blue: "from-[#e6f0ff] via-[#f7fbff] to-[#edf5ff]",
  neutral: "from-[#f4f4f2] via-[#fafaf8] to-[#f1f1ed]",
};

export default function ImagePlaceholder({
  tint,
  imageSrc,
  imageAlt,
  className,
}: ImagePlaceholderProps) {
  const filePath = join(process.cwd(), "public", imageSrc.replace(/^\//, ""));
  const hasImage = existsSync(filePath);

  return (
    <div
      className={cn(
        "relative min-h-[320px] overflow-hidden rounded-[28px] border border-border/70 bg-surface shadow-[0_28px_90px_-44px_rgba(15,23,42,0.55)]",
        className,
      )}
    >
      {/* src: {imageSrc} */}
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br opacity-100",
          tintClasses[tint],
        )}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(126,58,242,0.16),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.1),transparent_34%)]" />
      <div className="absolute inset-x-0 top-0 z-10 h-12 border-b border-white/40 bg-white/30 backdrop-blur-sm">
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
          className="object-cover object-top"
        />
      ) : (
        <div className="relative z-10 flex h-full min-h-[320px] items-center justify-center px-6 text-center text-sm text-text-tertiary">
          {imageAlt}
        </div>
      )}
      <div className="absolute inset-x-5 bottom-5 z-10 rounded-[18px] border border-white/60 bg-white/78 p-3 backdrop-blur-md">
        <div className="flex items-center justify-between gap-3">
          <div className="h-2 w-24 rounded-full bg-accent/20" />
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">
            <span className="h-2 w-2 rounded-full bg-accent" />
            Live preview
          </div>
        </div>
      </div>
    </div>
  );
}

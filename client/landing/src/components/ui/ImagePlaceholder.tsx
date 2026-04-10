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
  purple: "from-[#f0e7ff] via-[#faf6ff] to-[#f6efff]",
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
        "relative min-h-[320px] overflow-hidden rounded-lg border border-dashed border-border bg-surface shadow-card",
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
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.12),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(22,163,74,0.08),transparent_38%)]" />
      {hasImage ? (
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
        />
      ) : (
        <div className="relative z-10 flex h-full min-h-[320px] items-center justify-center px-6 text-center text-sm text-text-tertiary">
          {imageAlt}
        </div>
      )}
      <div className="absolute inset-x-6 bottom-6 z-10 rounded-md border border-white/60 bg-white/75 p-3 backdrop-blur-sm">
        <div className="h-2 w-24 rounded-full bg-accent/20" />
      </div>
    </div>
  );
}

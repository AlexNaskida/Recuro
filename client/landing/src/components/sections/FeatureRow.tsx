import type { FeatureRowData } from "@/types";
import Button from "@/components/ui/Button";
import CheckList from "@/components/ui/CheckList";
import ImagePlaceholder from "@/components/ui/ImagePlaceholder";
import { cn } from "@/lib/cn";

type FeatureRowProps = {
  data: FeatureRowData;
};

export default function FeatureRow({ data }: FeatureRowProps) {
  return (
    <section id={data.tag.toLowerCase()} className="py-8 sm:py-10">
      <div
        className={cn(
          "mx-auto grid max-w-[1100px] grid-cols-1 items-center gap-10 px-4 md:grid-cols-2 md:gap-16 md:px-8",
        )}
      >
        <div className={cn(data.reverse && "md:order-2")}>
          <ImagePlaceholder
            tint={data.tint}
            imageSrc={data.imageSrc}
            imageAlt={data.imageAlt}
            className="min-h-[340px]"
          />
        </div>

        <div className={cn("space-y-6", data.reverse && "md:order-1")}>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
            {data.tag}
          </p>
          <h3 className="font-display text-3xl font-extrabold tracking-tight text-text-primary sm:text-4xl">
            {data.title}
          </h3>
          <p className="max-w-xl text-base leading-7 text-text-secondary">
            {data.description}
          </p>
          <CheckList items={data.checklist} />
          <Button href={data.ctaHref} variant="primary" size="md">
            {data.ctaLabel}
          </Button>
        </div>
      </div>
    </section>
  );
}

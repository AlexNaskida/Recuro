import { BLOG_POSTS } from "@/lib/constants";
import Button from "@/components/ui/Button";
import ImagePlaceholder from "@/components/ui/ImagePlaceholder";

export default function BlogCards() {
  return (
    <section className="mx-auto max-w-[1100px] px-4 py-20 sm:px-6 lg:px-8">
      <div className="flex items-end justify-between gap-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-tertiary">
            Ecosystem
          </p>
          <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-text-primary sm:text-4xl">
            Read the latest thinking from the Recuro stack
          </h2>
        </div>
        <Button href="/blog" variant="ghost" size="sm">
          See all posts
        </Button>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
        {BLOG_POSTS.map((post) => (
          <article
            key={post.title}
            className="overflow-hidden rounded-md border border-border bg-surface shadow-card transition-transform duration-200 hover:-translate-y-1"
          >
            <div className="border-b border-dashed border-border bg-bg">
              <ImagePlaceholder
                tint="neutral"
                imageSrc={post.imageSrc}
                imageAlt={post.title}
                className="min-h-[140px] border-0 shadow-none"
              />
            </div>
            <div className="space-y-3 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
                {post.tag}
              </p>
              <h3 className="font-display text-xl font-extrabold tracking-tight text-text-primary">
                {post.title}
              </h3>
              <p className="text-sm text-text-tertiary">
                {post.date} · {post.readTime}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

import { BLOG_POSTS } from "@/lib/constants";
import Button from "@/components/ui/Button";
import type { BlogPost } from "@/types";

function BlogThumbnail({
  className = "",
  post,
}: {
  className?: string;
  post: BlogPost;
}) {
  return (
    <div className={`overflow-hidden bg-surface ${className}`}>
      <img
        src={post.imageSrc}
        alt={post.imageAlt}
        className="h-full w-full object-cover"
        draggable={false}
        loading="lazy"
      />
    </div>
  );
}

export default function BlogCards() {
  return (
    <section className="mx-auto max-w-[1100px] px-4 py-20 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div>
          <p className="text-xs font-semibold tracking-[0.24em] text-text-tertiary">
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
            className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card transition-transform duration-200 hover:-translate-y-1"
          >
            <div className="border-b border-dashed border-border">
              <BlogThumbnail post={post} className="min-h-[140px]" />
            </div>
            <div className="space-y-3 p-5">
              <p className="text-xs font-semibold tracking-[0.22em] text-accent">
                {post.tag}
              </p>
              <h3 className="font-display text-xl font-extrabold tracking-tight text-text-primary">
                <a href={`/blog/${post.slug}`} className="hover:underline">
                  {post.title}
                </a>
              </h3>
              <p className="text-sm text-text-tertiary">
                {post.date} · {post.readTime}
              </p>
              <a
                href={`/blog/${post.slug}`}
                className="inline-flex text-sm font-semibold text-accent hover:opacity-80"
              >
                Read article →
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

import { BLOG_POSTS } from "@/lib/constants";
import Navbar from "../../components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ImagePlaceholder from "@/components/ui/ImagePlaceholder";
import Button from "@/components/ui/Button";

export default function BlogPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-[1100px] px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-tertiary">
              Blog
            </p>
            <h1 className="mt-3 max-w-3xl font-display text-[clamp(32px,4.8vw,52px)] font-extrabold tracking-tight text-text-primary">
              Practical guides for building resilient stablecoin subscriptions
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-text-secondary">
              Deep dives on protocol design, security patterns, and operational
              playbooks for non-custodial recurring payments on Solana.
            </p>
          </div>
          <Button href="/" variant="ghost" size="sm">
            Back to home
          </Button>
        </div>

        <section className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {BLOG_POSTS.map((post) => (
            <article
              key={post.title}
              className="overflow-hidden rounded-md border border-border bg-surface shadow-card"
            >
              <div className="border-b border-dashed border-border bg-bg">
                <ImagePlaceholder
                  tint="neutral"
                  imageSrc={post.imageSrc}
                  imageAlt={post.title}
                  className="min-h-[160px] border-0 shadow-none"
                />
              </div>
              <div className="space-y-3 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
                  {post.tag}
                </p>
                <h2 className="font-display text-xl font-extrabold tracking-tight text-text-primary">
                  {post.title}
                </h2>
                <p className="text-sm text-text-tertiary">
                  {post.date} · {post.readTime}
                </p>
              </div>
            </article>
          ))}
        </section>
      </main>
      <Footer />
    </>
  );
}

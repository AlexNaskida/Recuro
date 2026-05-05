import { notFound } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Button from "@/components/ui/Button";
import { BLOG_POSTS } from "@/lib/constants";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

type ContentBlock =
  | { type: "heading"; value: string }
  | { type: "paragraph"; value: string }
  | { type: "code"; value: string; language: string }
  | { type: "ordered-list"; value: string[] };

function parseBody(body: string): ContentBlock[] {
  const chunks = body
    .split("\n\n")
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  return chunks.map((chunk) => {
    if (chunk.startsWith("```")) {
      const languageMatch = chunk.match(/^```([a-zA-Z0-9_-]+)?\n?/);
      const language = languageMatch?.[1] ?? "text";
      const value = chunk
        .replace(/^```[a-zA-Z0-9_-]*\n?/, "")
        .replace(/\n```$/, "")
        .trim();
      return { type: "code", value, language } as const;
    }

    const headingMatch = chunk.match(/^\*\*(.+)\*\*$/);
    if (headingMatch) {
      return { type: "heading", value: headingMatch[1] } as const;
    }

    const lines = chunk.split("\n").map((line) => line.trim());
    const orderedList = lines
      .map((line) => line.match(/^\d+\.\s+(.+)$/)?.[1] ?? null)
      .filter((item): item is string => Boolean(item));

    if (orderedList.length > 0 && orderedList.length === lines.length) {
      return { type: "ordered-list", value: orderedList } as const;
    }

    return { type: "paragraph", value: chunk } as const;
  });
}

export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = BLOG_POSTS.find((entry) => entry.slug === slug);

  if (!post || !post.body) {
    notFound();
  }

  const blocks = parseBody(post.body);

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-[860px] px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-xs font-semibold tracking-[0.24em] text-accent">
            {post.tag}
          </p>
          <Button href="/blog" variant="ghost" size="sm">
            Back to blog
          </Button>
        </div>

        <h1 className="mt-4 font-display text-[clamp(32px,4.6vw,52px)] font-extrabold tracking-tight text-text-primary">
          {post.title}
        </h1>

        <p className="mt-4 text-sm text-text-tertiary">
          {post.date} · {post.readTime}
        </p>

        <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
          <img
            src={post.imageSrc}
            alt={post.imageAlt}
            className="h-auto w-full object-cover"
            draggable={false}
          />
        </div>

        {post.excerpt && (
          <p className="mt-8 rounded-2xl border border-border bg-surface px-5 py-4 text-base leading-7 text-text-secondary">
            {post.excerpt}
          </p>
        )}

        <article className="mt-10 space-y-6">
          {blocks.map((block, index) => {
            if (block.type === "heading") {
              return (
                <h2
                  key={`${block.type}-${index}`}
                  className="font-display text-2xl font-extrabold tracking-tight text-text-primary"
                >
                  {block.value}
                </h2>
              );
            }

            if (block.type === "code") {
              return (
                <div
                  key={`${block.type}-${index}`}
                  className="overflow-hidden rounded-2xl border border-border bg-[#0f172a]"
                >
                  <div className="border-b border-white/10 px-4 py-2 text-xs uppercase tracking-[0.16em] text-slate-300">
                    {block.language}
                  </div>
                  <pre className="overflow-x-auto px-4 py-4 text-sm leading-6 text-slate-100">
                    <code>{block.value}</code>
                  </pre>
                </div>
              );
            }

            if (block.type === "ordered-list") {
              return (
                <ol
                  key={`${block.type}-${index}`}
                  className="space-y-2 pl-5 text-base leading-8 text-text-secondary"
                >
                  {block.value.map((item) => (
                    <li key={item} className="list-decimal">
                      {item}
                    </li>
                  ))}
                </ol>
              );
            }

            return (
              <p
                key={`${block.type}-${index}`}
                className="text-base leading-8 text-text-secondary"
              >
                {block.value}
              </p>
            );
          })}
        </article>
      </main>
      <Footer />
    </>
  );
}

import { Loader2 } from "lucide-react";

export default function LoadingScreen({
  title = "Checking wallet session...",
  description = "Preparing your secure merchant dashboard.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/40 px-4 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-4xl items-center justify-center">
        <div className="flex flex-col items-center gap-6 rounded-3xl border border-border/70 bg-card/90 px-8 py-12 text-center shadow-2xl backdrop-blur-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              {title}
            </h2>
            <p className="max-w-md text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

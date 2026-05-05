import { INSTALL_COMMANDS } from "@/lib/constants";
import CodeBadge from "@/components/ui/CodeBadge";

export default function InstallStrip() {
  return (
    <section className="border-y border-border bg-surface">
      <div className="mx-auto max-w-[1100px] px-4 py-12 text-center sm:px-6 lg:px-8">
        <p className="text-xs font-semibold tracking-[0.24em] text-text-tertiary">
          Install the SDK
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          {INSTALL_COMMANDS.map((command) => (
            <CodeBadge key={command}>{command}</CodeBadge>
          ))}
        </div>
      </div>
    </section>
  );
}

type SectionDividerProps = {
  title: string;
};

export default function SectionDivider({ title }: SectionDividerProps) {
  return (
    <div className="mx-auto max-w-[1100px] px-4 py-10 text-center sm:px-6 lg:px-8">
      <div className="flex items-center justify-center gap-3 text-text-tertiary">
        <span className="h-1.5 w-1.5 rounded-full bg-border" />
        <span className="h-1.5 w-1.5 rounded-full bg-accent/40" />
        <span className="h-1.5 w-1.5 rounded-full bg-border" />
      </div>
      <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-text-primary sm:text-4xl">
        {title}
      </h2>
    </div>
  );
}

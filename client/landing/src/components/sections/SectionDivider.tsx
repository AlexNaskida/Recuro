type SectionDividerProps = {
  title: string;
};

export default function SectionDivider({ title }: SectionDividerProps) {
  return (
    <div className="mx-auto max-w-[1100px] px-4 py-10 text-center sm:px-6 lg:px-8">
      <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-text-primary sm:text-4xl">
        {title}
      </h2>
    </div>
  );
}

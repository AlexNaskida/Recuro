import { COMPARISON_ROWS } from "@/lib/constants";

export default function ComparisonTable() {
  return (
    <section className="mx-auto max-w-[1100px] px-4 py-20 sm:px-6 lg:px-8">
      <div className="text-center">
        <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-text-primary sm:text-4xl">
          Compare Recuro with legacy subscription rails
        </h2>
      </div>

      <div className="mx-auto mt-10 max-w-[860px] overflow-hidden rounded-lg border border-border bg-surface shadow-card">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-bg text-text-primary">
            <tr>
              <th className="px-5 py-4 font-semibold">Feature</th>
              <th className="px-5 py-4 font-semibold">Recuro</th>
              <th className="px-5 py-4 font-semibold">Competitors</th>
            </tr>
          </thead>
          <tbody>
            {COMPARISON_ROWS.map((row) => (
              <tr
                key={row.feature}
                className="border-t border-border transition-colors hover:bg-bg"
              >
                <td className="px-5 py-4 font-medium text-text-primary">
                  {row.feature}
                </td>
                <td className="px-5 py-4 text-green font-medium">
                  {row.recuro}
                </td>
                <td className="px-5 py-4 text-text-secondary">
                  {row.competitors}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

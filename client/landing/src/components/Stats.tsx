const stats = [
  {
    value: "0.25%",
    label: "Protocol Fee",
    description: "Industry-leading low fees",
  },
  {
    value: "<1s",
    label: "Settlement Time",
    description: "Instant USDC transfers",
  },
  {
    value: "100%",
    label: "Non-Custodial",
    description: "Funds always in user wallet",
  },
  {
    value: "24/7",
    label: "Automated",
    description: "Payments execute on schedule",
  },
];

export default function Stats() {
  return (
    <section className="py-24 relative">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-teal-950/10 to-[#0a0a0a]" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="text-center p-6 rounded-2xl bg-white/[0.02] border border-white/5"
            >
              <div className="text-4xl sm:text-5xl font-bold text-gradient mb-2">
                {stat.value}
              </div>
              <div className="text-lg font-semibold text-white mb-1">
                {stat.label}
              </div>
              <div className="text-sm text-gray-500">{stat.description}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

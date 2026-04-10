import { FEATURE_ROWS } from "@/lib/constants";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Hero from "@/components/sections/Hero";
import LogoStrip from "@/components/sections/LogoStrip";
import SectionDivider from "@/components/sections/SectionDivider";
import FeatureRow from "@/components/sections/FeatureRow";
import StatsBanner from "@/components/sections/StatsBanner";
import PoweredBy from "@/components/sections/PoweredBy";
import ComparisonTable from "@/components/sections/ComparisonTable";
import BlogCards from "@/components/sections/BlogCards";
import InstallStrip from "@/components/sections/InstallStrip";
import DarkCTA from "@/components/sections/DarkCTA";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <LogoStrip />
        <SectionDivider title="One protocol for the full lifecycle" />
        <div id="features">
          {FEATURE_ROWS.slice(0, 2).map((row) => (
            <FeatureRow key={row.title} data={row} />
          ))}
          <StatsBanner />
          {FEATURE_ROWS.slice(2).map((row) => (
            <FeatureRow key={row.title} data={row} />
          ))}
        </div>
        <PoweredBy />
        <ComparisonTable />
        <BlogCards />
        <InstallStrip />
        <DarkCTA />
      </main>
      <Footer />
    </>
  );
}

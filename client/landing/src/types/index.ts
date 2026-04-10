export interface NavLink {
  label: string;
  href: string;
}

export interface FeatureRowData {
  tag: string;
  title: string;
  description: string;
  checklist: string[];
  ctaLabel: string;
  ctaHref: string;
  imageSrc: string;
  imageAlt: string;
  tint: "teal" | "purple" | "blue";
  reverse: boolean;
}

export interface StatItem {
  value: string;
  label: string;
}

export interface ComparisonRow {
  feature: string;
  recuro: string;
  competitors: string;
}

export interface BlogPost {
  tag: string;
  title: string;
  date: string;
  readTime: string;
  imageSrc: string;
}

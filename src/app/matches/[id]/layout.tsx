import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;

  const ogImage = `/matches/${encodeURIComponent(id)}/opengraph-image`;
  const twImage = `/matches/${encodeURIComponent(id)}/twitter-image`;

  return {
    title: "試合予想 | WC2026",
    openGraph: {
      title: "試合予想 | WC2026",
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title: "試合予想 | WC2026",
      images: [twImage],
    },
  };
}

export default function MatchesIdLayout({ children }: { children: React.ReactNode }) {
  return children;
}

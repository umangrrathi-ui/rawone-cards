import { notFound } from "next/navigation";
import CardView from "../../components/CardView";
import Tracker from "../../components/Tracker";
import { getLiveCard } from "../../lib/cards";

export const dynamic = "force-dynamic";

async function load(params) {
  const { slug } = await params;
  if (!/^[a-z0-9-]{3,40}$/.test(slug)) return null;
  return getLiveCard(slug);
}

export async function generateMetadata({ params }) {
  const live = await load(params);
  if (!live) return { title: "Card not found" };
  const v = live.view;
  return {
    title: [v.name, v.company].filter(Boolean).join(" · "),
    description: v.tagline || v.title || "",
    robots: { index: false, follow: false }, // personal contact details stay out of search engines
  };
}

export default async function PublicCard({ params }) {
  const live = await load(params);
  if (!live) notFound();
  return (
    <div className="m-page">
      <CardView card={live.view} />
      <Tracker slug={live.view.slug} />
    </div>
  );
}

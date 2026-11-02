import { notFound } from "next/navigation";
import CardView from "../../../components/CardView";
import { THEMES, demoCard } from "../../../lib/themes";

export function generateStaticParams() {
  return THEMES.map((t) => ({ theme: t.id }));
}

export async function generateMetadata({ params }) {
  const { theme } = await params;
  const t = THEMES.find((x) => x.id === theme);
  return { title: t ? `${t.name} · RAWONE Cards` : "Not found" };
}

export default async function ThemeDemo({ params, searchParams }) {
  const { theme } = await params;
  const sp = await searchParams;
  const pick = (k) => (/^[0-9a-f]{6}$/i.test(sp?.[k] || "") ? `#${sp[k]}` : "");
  const t = THEMES.find((x) => x.id === theme);
  if (!t) notFound();
  return (
    <div className="m-page">
      <CardView card={{ ...demoCard(t), brand: pick("brand"), bg1: pick("bg1"), bg2: pick("bg2") }} preview />
    </div>
  );
}

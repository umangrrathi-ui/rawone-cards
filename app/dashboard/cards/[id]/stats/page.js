import { notFound } from "next/navigation";
import Stats from "../../../../../components/dash/Stats";
import { currentUser } from "../../../../../lib/auth";
import { getMyCard } from "../../../../../lib/cards";
import { limitsOf } from "../../../../../lib/plans";
import { toId } from "../../../../../lib/api";

export default async function StatsPage({ params }) {
  const user = await currentUser();
  const id = toId((await params).id);
  const card = id ? await getMyCard(user.id, id) : null;
  if (!card) notFound();
  return <Stats id={card.id} name={card.data.name || card.slug} csv={limitsOf(user).csv} />;
}

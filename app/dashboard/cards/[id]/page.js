import { notFound } from "next/navigation";
import Editor from "../../../../components/dash/Editor";
import { currentUser } from "../../../../lib/auth";
import { getMyCard, toView } from "../../../../lib/cards";
import { baseUrl, toId } from "../../../../lib/api";

export default async function EditCard({ params }) {
  const user = await currentUser();
  const id = toId((await params).id);
  const card = id ? await getMyCard(user.id, id) : null;
  if (!card) notFound();
  const b = baseUrl();
  const initial = {
    card: { id: card.id, slug: card.slug, code: card.code, theme: card.theme, status: card.status, data: card.data, style: card.style },
    view: toView(card, user),
    links: { page: `${b}/${card.slug}`, nfc: `${b}/n/${card.code}`, qr: `${b}/q/${card.code}` },
  };
  return <Editor initial={initial} host={b.replace(/^https?:\/\//, "")} />;
}

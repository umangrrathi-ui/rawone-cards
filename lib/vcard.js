const esc = (s) => String(s ?? "").replace(/\\/g, "\\\\").replace(/\r\n|\r|\n/g, "\\n").replace(/([,;])/g, "\\$1");

// RFC 6350 line folding at 75 octets.
function fold(line) {
  const out = [];
  let rest = line;
  while (Buffer.byteLength(rest) > 75) {
    let cut = 75;
    while (Buffer.byteLength(rest.slice(0, cut)) > 75) cut--;
    out.push(rest.slice(0, cut));
    rest = " " + rest.slice(cut);
  }
  out.push(rest);
  return out.join("\r\n");
}

export function buildVcard(card, pageUrl) {
  const parts = card.name.trim().split(/\s+/);
  const last = parts.length > 1 ? parts.pop() : "";
  const first = parts.join(" ");
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${esc(last)};${esc(first)};;;`,
    `FN:${esc(card.name)}`,
  ];
  if (card.company) lines.push(`ORG:${esc(card.company)}`);
  if (card.title) lines.push(`TITLE:${esc(card.title)}`);
  if (card.phone) lines.push(`TEL;TYPE=CELL,VOICE:${card.phone}`);
  if (card.whatsapp && card.whatsapp !== card.phone) lines.push(`TEL;TYPE=CELL:${card.whatsapp}`);
  if (card.email) lines.push(`EMAIL;TYPE=INTERNET:${esc(card.email)}`);
  if (card.website) lines.push(`URL:${esc(card.website)}`);
  if (pageUrl) lines.push(`URL:${esc(pageUrl)}`);
  if (card.instagram) lines.push(`X-SOCIALPROFILE;TYPE=instagram:https://instagram.com/${card.instagram}`);
  if (card.linkedin) lines.push(`X-SOCIALPROFILE;TYPE=linkedin:https://www.linkedin.com/in/${card.linkedin}`);
  if (card.address) lines.push(`ADR;TYPE=WORK:;;${esc(card.address)};;;;`);
  if (card.tagline) lines.push(`NOTE:${esc(card.tagline)}`);
  const m = /^data:image\/(png|jpeg);base64,(.+)$/.exec(card.photoData || "");
  if (m) lines.push(`PHOTO;ENCODING=b;TYPE=${m[1] === "png" ? "PNG" : "JPEG"}:${m[2]}`);
  lines.push("END:VCARD");
  return lines.map(fold).join("\r\n") + "\r\n";
}

import QRCode from "qrcode";
import { baseUrl } from "./api";
import { themeById } from "./themes";

// QR on the printed card points at /q/<code> (never changes, even if the slug does).
export function qrUrl(card) {
  return `${baseUrl()}/q/${card.code}`;
}
export function nfcUrl(card) {
  return `${baseUrl()}/n/${card.code}`;
}

export async function qrSvg(card) {
  const [dark, light] = themeById(card.theme).qr;
  return QRCode.toString(qrUrl(card), {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    color: { dark, light },
  });
}

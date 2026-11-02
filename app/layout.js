import "./fonts";
import "../styles/m.css";
import "../styles/themes.css";
import "../styles/app.css";

export const metadata = {
  title: "RAWONE Cards",
  description: "Digital visiting cards with NFC and QR",
  robots: { index: false, follow: false },
};

export const viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

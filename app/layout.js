import "./globals.css";

export const metadata = {
  title: "Trend Pulse Dashboard",
  description: "Realtime trend dashboard powered by Next.js and Firebase Firestore.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}

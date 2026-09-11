import "./globals.css";

export const metadata = {
  title: "Smart Solar Mini Cold Storage",
  description: "Decentralized solar cold storage for farmers in the North Eastern Region",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

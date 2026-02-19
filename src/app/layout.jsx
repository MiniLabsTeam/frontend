import "./globals.css";
import Providers from "./providers";

export async function generateMetadata() {
  const URL = process.env.NEXT_PUBLIC_URL || "https://minigarageapp.vercel.app";
  
  return {
    title: "MiniLabs - NFT Car Racing on OneChain",
    description: "Collect, race, and own digital collectible cars as NFTs on OneChain. Your personal garage of legendary racing machines.",
    applicationName: "MiniLabs",
    manifest: "/manifest.webmanifest",
    icons: {
      icon: "/icons/icon-512.png",
    },
    other: {
      "fc:miniapp": JSON.stringify({
        version: "next",
        imageUrl: `${URL}/icons/icon-512.png`,
        button: {
          title: "Launch MiniLabs",
          action: {
            type: "launch_miniapp",
            name: "MiniLabs",
            url: URL,
            splashImageUrl: `${URL}/icons/icon-512.png`,
            splashBackgroundColor: "#ff7a00",
          },
        },
      }),
    },
  };
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#ff7a00",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className="min-h-screen antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

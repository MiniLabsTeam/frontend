export default function manifest() {
  return {
    name: "MiniLabs - NFT Car Racing on OneChain",
    short_name: "MiniLabs",
    description: "Collect, race, and own digital collectible cars as NFTs on OneChain.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0907",
    theme_color: "#ff7a00",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

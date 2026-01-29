function withValidProperties(properties) {
  return Object.fromEntries(
    Object.entries(properties).filter(([_, value]) => (Array.isArray(value) ? value.length > 0 : !!value))
  );
}

export async function GET() {
  const URL = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";

  const manifest = {
    accountAssociation: {
      // These will be added in step 5
      header: "",
      payload: "",
      signature: ""
    },
    miniapp: {
      version: "1",
      name: "MiniGarage",
      subtitle: "NFT Car Collection on Base",
      description: "Collect, race, and own digital collectible cars as NFTs on Base blockchain. Your personal garage of legendary racing machines.",
      screenshotUrls: [
        `${URL}/screenshots/home.png`,
        `${URL}/screenshots/gacha.png`,
        `${URL}/screenshots/inventory.png`
      ],
      iconUrl: `${URL}/icons/icon-512.png`,
      splashImageUrl: `${URL}/icons/icon-512.png`,
      splashBackgroundColor: "#ff7a00",
      homeUrl: URL,
      webhookUrl: `${URL}/api/webhook`,
      primaryCategory: "social",
      tags: ["nft", "cars", "racing", "collectibles", "base"],
      heroImageUrl: `${URL}/icons/icon-512.png`,
      tagline: "Your digital car collection",
      ogTitle: "MiniGarage - NFT Car Collection",
      ogDescription: "Collect, race, and own digital collectible cars as NFTs on Base blockchain",
      ogImageUrl: `${URL}/icons/icon-512.png`,
      noindex: true // Set to true during testing, false when ready to publish
    }
  };

  return Response.json(withValidProperties(manifest));
}

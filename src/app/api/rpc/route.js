const RPC_URL = "https://rpc-testnet.onelabs.cc";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const body = await request.text();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(RPC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body,
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const data = await res.text();

    return new Response(data, {
      status: res.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("RPC proxy error:", error.message);
    return new Response(
      JSON.stringify({ error: "RPC proxy failed", detail: error.message }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}

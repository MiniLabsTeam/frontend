const RPC_URL = "https://rpc-testnet.onelabs.cc";

export const runtime = "edge";

export async function POST(request) {
  try {
    const body = await request.text();

    const res = await fetch(RPC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body,
    });

    const data = await res.text();

    return new Response(data, {
      status: res.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "RPC proxy error", message: error.message }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}

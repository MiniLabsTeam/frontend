const RPC_URL = "https://rpc-testnet.onelabs.cc";

export async function POST(request) {
  const body = await request.text();

  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

  const data = await res.text();

  return new Response(data, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(request) {
  try {
    const body = await request.json();

    // Log webhook events for debugging
    console.log('Received webhook:', body);

    // Handle different webhook events here
    // Example: user installed app, uninstalled app, etc.

    return Response.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }
}

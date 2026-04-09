export default {
  fetch(request: Request) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      return Response.json({ name: "api" });
    }

    return new Response(null, { status: 404 });
  },
} satisfies ExportedHandler;

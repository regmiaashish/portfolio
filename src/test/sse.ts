/** Test helpers for streaming (text/event-stream) responses. */

export function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

/** The events of a complete, successful run, as the backend contract describes them. */
export function happyPathEvents(text = "Hi Spotify, I build reliable backends.", cached = false) {
  return [
    sseEvent("agent", { agent: "researcher", status: "running" }),
    sseEvent("log", { agent: "researcher", message: "Searching for Spotify, Backend" }),
    ": ping\n\n",
    sseEvent("agent", { agent: "researcher", status: "done" }),
    sseEvent("agent", { agent: "matchmaker", status: "running" }),
    sseEvent("log", { agent: "matchmaker", message: "Matched 3 projects" }),
    sseEvent("agent", { agent: "matchmaker", status: "done" }),
    sseEvent("agent", { agent: "writer", status: "running" }),
    ...text.split(/(?<= )/).map((part) => sseEvent("token", { text: part })),
    sseEvent("agent", { agent: "writer", status: "done" }),
    sseEvent("done", { cached, duration_ms: 1234 }),
  ];
}

/**
 * Splits the whole stream into awkward chunks (every `size` bytes, so lines, events and
 * multi-byte characters are cut mid-way) and returns a 200 text/event-stream Response.
 */
export function sseResponse(parts: string[], size = 7): Response {
  const bytes = new TextEncoder().encode(parts.join(""));
  const chunks: Uint8Array[] = [];
  for (let i = 0; i < bytes.length; i += size) chunks.push(bytes.slice(i, i + size));
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });
  return new Response(body, { status: 200, headers: { "Content-Type": "text/event-stream" } });
}

/** A stream that stays open until the test closes it or the request is aborted. */
export function openSseResponse(signal?: AbortSignal | null) {
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const body = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
      signal?.addEventListener("abort", () => {
        try {
          c.error(new DOMException("aborted", "AbortError"));
        } catch {
          // already closed
        }
      });
    },
  });
  const encoder = new TextEncoder();
  return {
    response: new Response(body, { status: 200, headers: { "Content-Type": "text/event-stream" } }),
    push: (text: string) => controller.enqueue(encoder.encode(text)),
    close: () => controller.close(),
  };
}

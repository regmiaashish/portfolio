/**
 * A small, incremental parser for Server-Sent Events (text/event-stream).
 *
 * Feed it decoded text in whatever chunks the network delivers; it returns the events
 * completed by that chunk. Lines may be split anywhere, including between "\r" and "\n".
 * An event is only emitted once its terminating blank line arrives.
 * Spec: https://html.spec.whatwg.org/multipage/server-sent-events.html#event-stream-interpretation
 */

export interface SseMessage {
  event: string;
  data: string;
}

export class SseParser {
  private buffer = "";
  private eventName = "";
  private dataLines: string[] = [];

  feed(chunk: string): SseMessage[] {
    this.buffer += chunk;
    const messages: SseMessage[] = [];

    for (;;) {
      const match = /\r\n|\r|\n/.exec(this.buffer);
      if (!match) break;
      // A lone "\r" at the very end may be the first half of "\r\n": wait for more text.
      if (match[0] === "\r" && match.index === this.buffer.length - 1) break;

      const line = this.buffer.slice(0, match.index);
      this.buffer = this.buffer.slice(match.index + match[0].length);
      const message = this.processLine(line);
      if (message) messages.push(message);
    }
    return messages;
  }

  private processLine(line: string): SseMessage | null {
    if (line === "") {
      // Blank line: dispatch the event, if it carried any data.
      const message =
        this.dataLines.length > 0
          ? { event: this.eventName || "message", data: this.dataLines.join("\n") }
          : null;
      this.eventName = "";
      this.dataLines = [];
      return message;
    }
    if (line.startsWith(":")) return null; // comment, e.g. the server's ": ping" keep-alive

    const colon = line.indexOf(":");
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? "" : line.slice(colon + 1);
    if (value.startsWith(" ")) value = value.slice(1);

    if (field === "event") this.eventName = value;
    else if (field === "data") this.dataLines.push(value);
    // "id" and "retry" are irrelevant here: this client never reconnects.
    return null;
  }
}

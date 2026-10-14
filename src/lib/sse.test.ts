import { describe, expect, it } from "vitest";

import { SseParser } from "./sse";

function parseAll(chunks: string[]) {
  const parser = new SseParser();
  return chunks.flatMap((chunk) => parser.feed(chunk));
}

describe("SseParser", () => {
  it("parses named events with JSON data", () => {
    expect(parseAll(['event: token\ndata: {"text":"Hi"}\n\n'])).toEqual([
      { event: "token", data: '{"text":"Hi"}' },
    ]);
  });

  it("defaults the event name to message", () => {
    expect(parseAll(["data: plain\n\n"])).toEqual([{ event: "message", data: "plain" }]);
  });

  it("handles input split at every possible character", () => {
    const stream = 'event: agent\ndata: {"agent":"writer"}\n\nevent: done\ndata: {}\n\n';
    expect(parseAll(stream.split(""))).toEqual([
      { event: "agent", data: '{"agent":"writer"}' },
      { event: "done", data: "{}" },
    ]);
  });

  it("handles CRLF line endings, even when \\r and \\n arrive in different chunks", () => {
    expect(parseAll(["event: done\r", "\ndata: {}\r\n\r", "\n"])).toEqual([
      { event: "done", data: "{}" },
    ]);
  });

  it("handles bare CR line endings", () => {
    expect(parseAll(["event: done\rdata: x\r\rafter"])).toEqual([{ event: "done", data: "x" }]);
  });

  it("ignores comments such as keep-alive pings", () => {
    expect(parseAll([": ping\n\n", ":another\n", "data: x\n\n"])).toEqual([
      { event: "message", data: "x" },
    ]);
  });

  it("joins multi-line data with newlines", () => {
    expect(parseAll(["data: line one\ndata: line two\n\n"])).toEqual([
      { event: "message", data: "line one\nline two" },
    ]);
  });

  it("strips exactly one space after the colon", () => {
    expect(parseAll(["data:  two spaces\ndata:none\n\n"])).toEqual([
      { event: "message", data: " two spaces\nnone" },
    ]);
  });

  it("does not emit an event until its blank line arrives", () => {
    const parser = new SseParser();
    expect(parser.feed("event: done\ndata: {}\n")).toEqual([]);
    expect(parser.feed("\n")).toEqual([{ event: "done", data: "{}" }]);
  });

  it("drops events without data and resets the name between events", () => {
    expect(parseAll(["event: orphan\n\n", "data: x\n\n"])).toEqual([
      { event: "message", data: "x" },
    ]);
  });

  it("ignores id and retry fields", () => {
    expect(parseAll(["id: 7\nretry: 1000\ndata: x\n\n"])).toEqual([
      { event: "message", data: "x" },
    ]);
  });
});

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Panel } from "./Panel";
import { Readout, ReadoutList } from "./Readout";
import { sparklinePoints } from "../../lib/sparkline";
import { Sparkline } from "./Sparkline";
import { StatusLight } from "./StatusLight";

describe("console primitives", () => {
  it("Panel renders its header label, status and body", () => {
    render(
      <Panel title="agents.pipeline" status={<StatusLight status="live" label="ready" />}>
        <p>Body</p>
      </Panel>,
    );

    expect(screen.getByText("agents.pipeline")).toBeInTheDocument();
    expect(screen.getByText("ready")).toBeInTheDocument();
    expect(screen.getByText("Body")).toBeInTheDocument();
  });

  it("StatusLight always carries a text label, visible or for screen readers only", () => {
    const { rerender } = render(<StatusLight status="running" label="running" />);
    expect(screen.getByText("running")).not.toHaveClass("visually-hidden");

    rerender(<StatusLight status="running" label="running" showLabel={false} />);
    expect(screen.getByText("running")).toHaveClass("visually-hidden");
  });

  it("Readouts form a description list", () => {
    render(
      <ReadoutList aria-label="Profile">
        <Readout label="based in">Kathmandu, Nepal</Readout>
        <Readout label="latency" unit="ms">
          84
        </Readout>
      </ReadoutList>,
    );

    const list = screen.getByLabelText("Profile");
    expect(list.tagName).toBe("DL");
    expect(within(list).getByText("based in").tagName).toBe("DT");
    expect(within(list).getByText("Kathmandu, Nepal").tagName).toBe("DD");
    expect(within(list).getByText("ms")).toBeInTheDocument();
  });

  it("Sparkline scales points into the box and labels the series", () => {
    expect(sparklinePoints([10, 20], 20, 10, 0)).toBe("0.0,10.0 20.0,0.0");
    expect(sparklinePoints([5], 20, 10)).toBe("");

    render(<Sparkline values={[80, 120, 100]} label="API latency: 80 to 120 ms" />);
    expect(screen.getByRole("img", { name: "API latency: 80 to 120 ms" })).toBeInTheDocument();
  });

  it("Sparkline shows a placeholder with too few values", () => {
    const { container } = render(<Sparkline values={[]} label="No data yet" />);

    expect(container.querySelector("polyline")).toBeNull();
    expect(container.querySelector("line")).not.toBeNull();
  });
});

/** Regression tests for three small shared fixes made with the Résumé page. */
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { contentSnapshot } from "../../data/snapshot";
import { ProjectCard } from "../sections/ProjectCard";
import { Sparkline } from "./Sparkline";
import { StatusLight } from "./StatusLight";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Sparkline with one sample", () => {
  it("draws a point, not the dashed empty placeholder", () => {
    const { container } = render(<Sparkline values={[84]} label="API latency: 84 ms" />);

    expect(container.querySelector("circle")).not.toBeNull();
    expect(container.querySelector("line")?.getAttribute("class") ?? "").not.toMatch(/sparkEmpty/);
    expect(screen.getByRole("img", { name: "API latency: 84 ms" })).toBeInTheDocument();
  });
});

describe("ProjectCard image priority", () => {
  it("uses the lowercase fetchpriority attribute without React warnings", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const project = {
      ...contentSnapshot.projects[0],
      image: { url: "/images/x.png", alt: "Shot", width: 800, height: 500 },
    };

    render(
      <MemoryRouter>
        <ProjectCard project={project} eager />
      </MemoryRouter>,
    );

    expect(screen.getByAltText("Shot")).toHaveAttribute("fetchpriority", "high");
    expect(error.mock.calls.flat().join(" ")).not.toMatch(/fetchPriority/);
  });
});

describe("StatusLight online", () => {
  it("renders a filled 'online' lamp (styled by the online class, which every theme colours)", () => {
    const { container } = render(<StatusLight status="online" label="api online" />);

    const light = container.firstElementChild!;
    expect(light).toHaveAttribute("data-status", "online");
    expect(light.className).toMatch(/online/);
    expect(screen.getByText("api online")).toBeInTheDocument();
  });
});

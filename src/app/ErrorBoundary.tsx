import { Component, type ErrorInfo, type ReactNode } from "react";

import { Container } from "../components/layout/Container";
import { Button } from "../components/ui/Button";

interface State {
  error: Error | null;
}

/** Keeps the header and footer usable if a page crashes while rendering. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Page crashed", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <Container style={{ paddingBlock: "var(--space-8)" }}>
        <h1>Something went wrong</h1>
        <p style={{ marginBlock: "var(--space-4)" }}>
          This page hit an unexpected error. Reloading usually fixes it.
        </p>
        <Button variant="primary" onClick={() => window.location.reload()}>
          Reload the page
        </Button>
      </Container>
    );
  }
}

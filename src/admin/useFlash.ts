import { useLocation } from "react-router";

/** The one-off confirmation passed through navigation state after a save. */
export function useFlash(): string | undefined {
  const { state } = useLocation();
  return (state as { flash?: string } | null)?.flash;
}

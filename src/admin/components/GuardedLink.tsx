import type { MouseEvent } from "react";
import { Link, type LinkProps } from "react-router";

import { useLeaveGuard } from "../unsaved";

/** A react-router Link that asks before leaving a form with unsaved changes. */
export function GuardedLink({ onClick, children, ...rest }: LinkProps) {
  const canLeave = useLeaveGuard();
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!canLeave()) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  };
  return (
    <Link onClick={handleClick} {...rest}>
      {children}
    </Link>
  );
}

import type { MouseEvent } from "react";
import { Link, type LinkProps, NavLink, type NavLinkProps } from "react-router";

import { useTransitionClick } from "../../hooks/useTransitionNavigate";

function chain(
  own: (event: MouseEvent<HTMLAnchorElement>) => void,
  theirs?: (event: MouseEvent<HTMLAnchorElement>) => void,
) {
  return (event: MouseEvent<HTMLAnchorElement>) => {
    theirs?.(event);
    own(event);
  };
}

/** A router Link that animates the page change (when supported and motion is allowed). */
export function TransitionLink({ to, onClick, ...rest }: LinkProps) {
  const transition = useTransitionClick(to);
  return <Link to={to} onClick={chain(transition, onClick)} {...rest} />;
}

/** NavLink variant: also sets aria-current="page" on the active route. */
export function TransitionNavLink({ to, onClick, ...rest }: NavLinkProps) {
  const transition = useTransitionClick(to);
  return <NavLink to={to} onClick={chain(transition, onClick)} {...rest} />;
}

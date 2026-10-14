import { type AnchorHTMLAttributes, type ButtonHTMLAttributes, forwardRef } from "react";
import { Link, type LinkProps } from "react-router";

import styles from "./Button.module.css";

export type ButtonVariant = "primary" | "secondary" | "ghost";

interface StyleProps {
  variant?: ButtonVariant;
  size?: "md" | "sm";
  /** Square button for a single icon; give it an aria-label. */
  iconOnly?: boolean;
}

function classes({ variant = "secondary", size = "md", iconOnly }: StyleProps, extra?: string) {
  return [
    styles.button,
    styles[variant],
    size === "sm" && styles.sm,
    iconOnly && styles.icon,
    extra,
  ]
    .filter(Boolean)
    .join(" ");
}

type ButtonProps = StyleProps & ButtonHTMLAttributes<HTMLButtonElement>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, iconOnly, className, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={classes({ variant, size, iconOnly }, className)}
      {...rest}
    />
  );
});

type ButtonLinkProps = StyleProps & LinkProps;

/** An in-app link (react-router) that looks like a button. */
export function ButtonLink({ variant, size, iconOnly, className, ...rest }: ButtonLinkProps) {
  return <Link className={classes({ variant, size, iconOnly }, className)} {...rest} />;
}

type ButtonAnchorProps = StyleProps & AnchorHTMLAttributes<HTMLAnchorElement>;

/** An external or mailto link that looks like a button. */
export function ButtonAnchor({ variant, size, iconOnly, className, children, ...rest }: ButtonAnchorProps) {
  return (
    <a className={classes({ variant, size, iconOnly }, className)} {...rest}>
      {children}
    </a>
  );
}

/**
 * Tydigo AuthTrigger / GetStartedAuthButton
 *
 * A reusable, explicit trigger that opens the shared authentication dialog.
 * Supports existing button variants, icons, and accessible keyboard activation.
 * Never renders a nested <button> — it renders a real <button> directly.
 */

import { forwardRef, type ReactNode, type ButtonHTMLAttributes } from "react";
import { useAuthDialog, type PublicAccountType, type AuthDialogMode } from "./auth-dialog-context";

type AuthTriggerProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> & {
  mode?: AuthDialogMode;
  accountType?: PublicAccountType;
  source?: string;
  returnTo?: string;
  children: ReactNode;
};

/**
 * A button that opens the shared auth dialog. Use this for every
 * authentication-intent CTA across the public site.
 */
export const AuthTrigger = forwardRef<HTMLButtonElement, AuthTriggerProps>(
  function AuthTrigger(
    { mode = "signup", accountType, source, returnTo, children, ...buttonProps },
    ref,
  ) {
    const { openAuthDialog } = useAuthDialog();

    return (
      <button
        ref={ref}
        type="button"
        onClick={() => openAuthDialog({ mode, accountType, source, returnTo })}
        {...buttonProps}
      >
        {children}
      </button>
    );
  },
);

/**
 * Convenience alias for the common "Get Started" signup CTA.
 */
export const GetStartedAuthButton = AuthTrigger;

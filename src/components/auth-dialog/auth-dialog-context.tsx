/**
 * Tydigo Auth Dialog Controller
 *
 * A single application-level controller for the public authentication dialog.
 * Lifts the dialog state out of individual components so every "Get Started"
 * CTA across the public site opens the same shared dialog instance.
 *
 * The dialog itself is mounted once (in AuthDialogProvider) and reads its
 * state from this context. Triggers only send context — they never render
 * their own dialog.
 */

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export type PublicAccountType =
  | "household"
  | "estate"
  | "business"
  | "collector"
  | "recycler"
  | "organic_partner"
  | "fleet_owner"
  | "corporate_partner"
  | "government";

export type AuthDialogMode = "signup" | "signin";

export interface OpenAuthDialogOptions {
  mode: AuthDialogMode;
  accountType?: PublicAccountType;
  source?: string;
  returnTo?: string;
}

interface AuthDialogController {
  openAuthDialog(options: OpenAuthDialogOptions): void;
  closeAuthDialog(): void;
}

type AuthDialogState = {
  open: boolean;
  mode: AuthDialogMode;
  accountType: PublicAccountType | null;
  source: string | null;
  returnTo: string | null;
};

const AuthDialogContext = createContext<AuthDialogController | null>(null);

// Internal state context so the dialog can read current values without
// re-rendering the whole tree on every keystroke.
const AuthDialogStateContext = createContext<AuthDialogState>({
  open: false,
  mode: "signup",
  accountType: null,
  source: null,
  returnTo: null,
});

export function AuthDialogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthDialogState>({
    open: false,
    mode: "signup",
    accountType: null,
    source: null,
    returnTo: null,
  });

  const openAuthDialog = useCallback((options: OpenAuthDialogOptions) => {
    setState({
      open: true,
      mode: options.mode,
      accountType: options.accountType ?? null,
      source: options.source ?? null,
      returnTo: options.returnTo ?? null,
    });
  }, []);

  const closeAuthDialog = useCallback(() => {
    setState((prev) => ({ ...prev, open: false }));
  }, []);

  const controller = useMemo<AuthDialogController>(
    () => ({ openAuthDialog, closeAuthDialog }),
    [openAuthDialog, closeAuthDialog],
  );

  return (
    <AuthDialogContext.Provider value={controller}>
      <AuthDialogStateContext.Provider value={state}>
        {children}
      </AuthDialogStateContext.Provider>
    </AuthDialogContext.Provider>
  );
}

/** Controller used by triggers to open/close the dialog. */
export function useAuthDialog(): AuthDialogController {
  const ctx = useContext(AuthDialogContext);
  if (!ctx) throw new Error("useAuthDialog must be used within AuthDialogProvider");
  return ctx;
}

/** Read-only state used by the single mounted dialog. */
export function useAuthDialogState(): AuthDialogState {
  return useContext(AuthDialogStateContext);
}

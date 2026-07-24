import { create } from "zustand";
import { clearAuthSession, getAuthSession } from "@/services/auth-session";
import type { AuthSession } from "@/types/domain";

type AuthStatus = "unknown" | "authenticated" | "guest";

type AuthStoreState = {
  status: AuthStatus;
  session: AuthSession | null;
  loading: boolean;
  hydrate: () => void;
  register: (username: string, password: string) => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  startDemo: () => Promise<void>;
  logout: () => void;
};

export const useAuthStore = create<AuthStoreState>((set) => ({
  status: "unknown",
  session: null,
  loading: false,
  hydrate: () => {
    const session = getAuthSession();
    if (session && !session.syncToken?.startsWith("v2.") && !session.syncToken?.startsWith("local-demo")) {
      void import("@/services/auth-service")
        .then(({ syncLegacyLocalAccountToBackend }) => syncLegacyLocalAccountToBackend(session.userId))
        .then((syncedSession) => {
          if (syncedSession) set({ session: syncedSession, status: "authenticated" });
        })
        .catch(() => undefined);
    }
    set({
      session,
      status: session ? "authenticated" : "guest",
    });
  },
  register: async (username, password) => {
    set({ loading: true });
    try {
      const { registerAccount } = await import("@/services/auth-service");
      await registerAccount(username, password);
      set({ loading: false });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },
  login: async (username, password) => {
    set({ loading: true });
    try {
      const { loginAccount } = await import("@/services/auth-service");
      const session = await loginAccount(username, password);
      set({
        session,
        status: "authenticated",
        loading: false,
      });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },
  startDemo: async () => {
    set({ loading: true });
    try {
      const { startDemoAccount } = await import("@/services/auth-service");
      const session = await startDemoAccount();
      set({
        session,
        status: "authenticated",
        loading: false,
      });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },
  logout: () => {
    const session = getAuthSession();
    clearAuthSession();
    void import("@/services/auth-service")
      .then(({ logoutAccount }) => logoutAccount(session))
      .catch(() => undefined);
    set({
      session: null,
      status: "guest",
      loading: false,
    });
  },
}));

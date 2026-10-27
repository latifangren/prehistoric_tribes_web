export interface BackButtonAdapter {
  subscribe(handler: () => void): () => void;
}

export const webBackButtonAdapter: BackButtonAdapter = {
  subscribe(handler: () => void): () => void {
    if (typeof window === "undefined") return () => {};

    let active = true;
    let unregisterTauri: (() => void) | null = null;

    // 1. Tauri 2 Android hardware & gesture back button listener
    if ("__TAURI_INTERNALS__" in window || "__TAURI__" in window) {
      import("@tauri-apps/api/app")
        .then(({ onBackButtonPress }) => {
          if (!active) return;
          return onBackButtonPress(() => {
            if (active) handler();
          });
        })
        .then((listener) => {
          if (!active) {
            listener?.unregister().catch(() => {});
          } else if (listener) {
            unregisterTauri = () => {
              listener.unregister().catch(() => {});
            };
          }
        })
        .catch(() => {});
    }

    // 2. Android WebView / Cordova backbutton event
    const onDocBack = (e: Event) => {
      e.preventDefault?.();
      if (active) handler();
    };
    if (typeof document !== "undefined") {
      document.addEventListener("backbutton", onDocBack);
    }

    // 3. Mobile browser / PWA popstate history trap
    const onPopState = () => {
      if (!active) return;
      try {
        window.history.pushState({ pt: "active" }, "");
      } catch {}
      handler();
    };

    if (window.history) {
      try {
        window.history.pushState({ pt: "active" }, "");
      } catch {}
      window.addEventListener("popstate", onPopState);
    }

    return () => {
      active = false;
      unregisterTauri?.();
      if (typeof document !== "undefined") {
        document.removeEventListener("backbutton", onDocBack);
      }
      window.removeEventListener("popstate", onPopState);
    };
  },
};

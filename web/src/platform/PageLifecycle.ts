export type PageVisibility = "visible" | "hidden";

export interface PageLifecycleAdapter {
  subscribe(listener: (visibility: PageVisibility) => void): () => void;
}

export const webPageLifecycleAdapter: PageLifecycleAdapter = {
  subscribe(listener) {
    let hidden = document.visibilityState === "hidden";
    const update = (nextHidden: boolean) => {
      if (hidden === nextHidden) return;
      hidden = nextHidden;
      listener(hidden ? "hidden" : "visible");
    };
    const onVisibilityChange = () => update(document.visibilityState === "hidden");
    const onPageHide = () => update(true);
    const onPageShow = () => update(document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("pageshow", onPageShow);
    };
  },
};

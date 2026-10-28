export type RadialMenuAction = { glyph: string; label: string; run(): void };

const ITEMS: ReadonlyArray<{ glyph: string; label: string; angle: number }> = [
  { glyph: "spear", label: "Attack-Move (T)", angle: -90 },
  { glyph: "cmd-arms", label: "Call to Arms / Back to Work", angle: -18 },
  { glyph: "cmd-rally", label: "Form Up / Dismiss", angle: 54 },
  { glyph: "cmd-map", label: "Minimap", angle: 126 },
  { glyph: "pt-man", label: "Villager Roster", angle: 198 },
];

/** A short-lived command wheel anchored at the pointer's viewport position. */
export class RadialMenu {
  private readonly root: HTMLDivElement;
  private opened = false;
  private origin: { x: number; y: number } | null = null;
  private actions: RadialMenuAction[] = [];
  private readonly onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape" && this.opened) { event.preventDefault(); this.close(); }
  };
  private readonly onOutside = (event: PointerEvent) => {
    if (event.button === 2) return;
    if (this.opened && !this.root.contains(event.target as Node)) this.close();
  };

  constructor() {
    this.root = document.createElement("div");
    this.root.className = "hud-radial";
    this.root.hidden = true;
    this.root.setAttribute("role", "menu");
    const hub = document.createElement("div");
    hub.className = "hud-radial-hub";
    hub.setAttribute("aria-hidden", "true");
    this.root.append(hub);
    document.body.append(this.root);
    document.addEventListener("keydown", this.onKeyDown);
    document.addEventListener("pointerdown", this.onOutside);
  }

  setActions(actions: readonly RadialMenuAction[]): void {
    this.actions = [...actions];
    this.root.querySelectorAll("button").forEach((button) => button.remove());
    ITEMS.forEach((item, index) => {
      const action = this.actions[index];
      if (!action) return;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "hud-radial-item";
      button.setAttribute("role", "menuitem");
      button.setAttribute("aria-label", action.label);
      button.title = action.label;
      button.innerHTML = `<span class="hud-radial-glyph" aria-hidden="true"><img src="hd/ui/${item.glyph}.png" alt=""></span><span class="hud-radial-label">${action.label}</span>`;
      const radians = item.angle * Math.PI / 180;
      button.style.setProperty("--radial-x", `${Math.cos(radians) * 76}px`);
      button.style.setProperty("--radial-y", `${Math.sin(radians) * 76}px`);
      button.addEventListener("click", () => { action.run(); this.close(); });
      this.root.append(button);
    });
  }

  open(clientX: number, clientY: number): void {
    this.origin = { x: clientX, y: clientY };
    this.root.style.left = `${clientX}px`;
    this.root.style.top = `${clientY}px`;
    this.root.hidden = false;
    this.opened = true;
  }

  close(): void { this.opened = false; this.origin = null; this.root.hidden = true; }
  isOpen(): boolean { return this.opened; }

  release(clientX: number, clientY: number): void {
    if (!this.opened || !this.origin) return;
    const dx = clientX - this.origin.x;
    const dy = clientY - this.origin.y;
    if (Math.hypot(dx, dy) < 28) return;
    const angle = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
    const index = Math.round(((angle + 90 + 360) % 360) / 72) % 5;
    const action = this.actions[index];
    this.close();
    action?.run();
  }
}

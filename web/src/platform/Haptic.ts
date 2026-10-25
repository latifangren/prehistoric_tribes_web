/**
 * Lightweight, safe haptic vibration feedback for mobile web gameplay.
 * Automatically no-ops on desktop browsers or devices without vibration hardware.
 */
class HapticFeedback {
  private enabled = true;

  vibrate(pattern: number | number[]): void {
    if (!this.enabled || typeof navigator === "undefined" || !("vibrate" in navigator)) return;
    try {
      navigator.vibrate(pattern);
    } catch {
      // ignore unsupported or restricted hardware errors
    }
  }

  /** Subtle micro-tick on selecting a unit, building, or menu item (8ms) */
  tap(): void {
    this.vibrate(8);
  }

  /** Satisfying confirmation pulse when dispatching an order or building (14ms) */
  order(): void {
    this.vibrate(14);
  }

  /** Urgent double pulse when under attack or danger alert */
  alert(): void {
    this.vibrate([35, 45, 35]);
  }

  /** Triumphant pulse sequence when achieving victory or unlocking trophy */
  success(): void {
    this.vibrate([20, 30, 20, 30, 45]);
  }
}

export const haptic = new HapticFeedback();

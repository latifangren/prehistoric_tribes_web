
export type LegacyAQAudioState = { h: number; e: number; currentTrack: number; currentPlayerReady: number; currentPlayerTrack: number };
export type LegacyAQAudioInput = {
  readonly state: LegacyAQAudioState; readonly audioTable: Int8Array;
  readonly randomRemainder: (mask: number, divisor: number) => number;
  readonly onSubsystemDecision?: () => void; readonly onStop?: () => void;
  readonly onCreate?: (path: string, type: string) => void; readonly onSetMode?: (value: number) => void;
};

/** Exact f.aQ() MIDI track selection and player reuse boundary. */
export function stepLegacyAQAudio(input: LegacyAQAudioInput): void {
  const { state } = input;
  input.onSubsystemDecision?.();
  const track = input.audioTable[state.h * 2 + input.randomRemainder(255, 2)];
  if (state.currentPlayerReady > 100 && track === state.currentPlayerTrack) return;
  state.currentTrack = track;
  input.onStop?.();
  input.onCreate?.(`/s${track}`, "audio/midi");
  input.onSetMode?.(state.e);
}

export type LegacyASAudioState = {
  ZFlag: boolean; Q: number; R: number; ac: boolean; ab: boolean; v: number; S: number;
  z: number; B: number; J: number; I: number; L: number; K: number; y: number; A: number;
  YFlag: boolean; n: boolean; ad: boolean; e: number; playerExists: boolean; playerDuration: number;
};
export type LegacyASAudioInput = {
  readonly state: LegacyASAudioState; readonly onStopWait?: () => void;
  readonly onAQ?: () => void; readonly onSleep?: (milliseconds: number) => void;
};

/** Exact f.aS() state/audio wait step; repeated Y waits are caller-driven. */
export function stepLegacyASAudioWait(input: LegacyASAudioInput): void {
  const { state } = input;
  if (!state.ZFlag) return;
  if (state.Q !== 27 && state.ac) {
    state.ab = true; state.v = 0; state.S = state.R; state.R = state.Q; state.Q = 27;
    state.z = state.y; state.B = state.A; state.J = state.I; state.L = state.K;
  }
  if (state.YFlag) { state.n = false; input.onStopWait?.(); return; }
  state.ZFlag = false; state.ad = false;
  if (state.Q !== 27 && state.e === 2 && (!state.playerExists || state.playerDuration !== 400)) input.onAQ?.();
  input.onSleep?.(10);
}

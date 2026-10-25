import { loadBinaryResource } from "./BinaryResource";
import { audioManager } from "./AudioManager";
import { getMasterVolume, onMasterVolumeChange } from "./SoundEffects";

// f.f is the cumulative offset array used by class a; f.e stores slice lengths.
export const SA_OFFSETS = [0, 8014, 14329, 19977, 23382] as const;
export const SA_LENGTHS = [8014, 6315, 5648, 3405, 3234] as const;

export type MidiResource = {
  readonly bytes: Uint8Array;
  readonly offsets: readonly number[];
  readonly lengths: readonly number[];
};

export type MidiNoteEvent = {
  readonly startSeconds: number;
  readonly durationSeconds: number;
  readonly channel: number;
  readonly note: number;
  readonly velocity: number;
};

export type ParsedMidi = {
  readonly format: number;
  readonly division: number;
  readonly durationSeconds: number;
  readonly notes: readonly MidiNoteEvent[];
};

/** Loads the original /sa byte stream and its confirmed f.f/f.e slices. */
export async function loadMidiResource(): Promise<MidiResource> {
  const resource = await loadBinaryResource("assets/sa", 26616);
  return { bytes: resource.bytes, offsets: SA_OFFSETS, lengths: SA_LENGTHS };
}

function u16(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] << 8) | bytes[offset + 1];
}

function u32(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] * 0x1000000) + (bytes[offset + 1] << 16) + (bytes[offset + 2] << 8) + bytes[offset + 3];
}

function variableLength(bytes: Uint8Array, cursor: { value: number }): number {
  let value = 0;
  let next: number;
  do {
    next = bytes[cursor.value++] ?? 0;
    value = (value << 7) | (next & 0x7f);
  } while ((next & 0x80) !== 0);
  return value;
}

/** Decodes the original standard-MIDI slices without changing their events. */
export function parseStandardMidi(bytes: Uint8Array): ParsedMidi {
  if (bytes.length < 14 || String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]) !== "MThd") {
    throw new RangeError("MIDI header is missing");
  }
  const format = u16(bytes, 8);
  const trackCount = u16(bytes, 10);
  const division = u16(bytes, 12);
  if ((division & 0x8000) !== 0) throw new RangeError("SMPTE MIDI division is unsupported");
  type RawEvent = { tick: number; kind: "on" | "off" | "tempo"; channel: number; note: number; velocity: number; tempo: number };
  const allEvents: RawEvent[] = [];
  let cursor = 14;
  for (let track = 0; track < trackCount; track += 1) {
    if (String.fromCharCode(bytes[cursor], bytes[cursor + 1], bytes[cursor + 2], bytes[cursor + 3]) !== "MTrk") {
      throw new RangeError(`MIDI track ${track} header is missing`);
    }
    const end = cursor + 8 + u32(bytes, cursor + 4);
    cursor += 8;
    let tick = 0;
    let running = 0;
    const events: RawEvent[] = [];
    while (cursor < end) {
      const deltaCursor = { value: cursor };
      tick += variableLength(bytes, deltaCursor);
      cursor = deltaCursor.value;
      let status = bytes[cursor++] ?? 0;
      if (status < 0x80) {
        cursor -= 1;
        status = running;
      } else if (status < 0xf0) {
        running = status;
      }
      if (status === 0xff) {
        const metaType = bytes[cursor++] ?? 0;
        const lengthCursor = { value: cursor };
        const length = variableLength(bytes, lengthCursor);
        cursor = lengthCursor.value;
        if (metaType === 0x51 && length === 3) {
          const tempo = (bytes[cursor] << 16) | (bytes[cursor + 1] << 8) | bytes[cursor + 2];
          events.push({ tick, kind: "tempo", channel: 0, note: 0, velocity: 0, tempo });
        }
        cursor += length;
        if (metaType === 0x2f) break;
        continue;
      }
      if (status === 0xf0 || status === 0xf7) {
        const lengthCursor = { value: cursor };
        cursor = lengthCursor.value;
        const length = variableLength(bytes, lengthCursor);
        cursor = lengthCursor.value + length;
        continue;
      }
      if (status < 0x80 || status >= 0xf0) break;
      const kind = status & 0xf0;
      const channel = status & 0x0f;
      const first = bytes[cursor++] ?? 0;
      const second = kind === 0xc0 || kind === 0xd0 ? 0 : (bytes[cursor++] ?? 0);
      if (kind === 0x90 && second !== 0) events.push({ tick, kind: "on", channel, note: first, velocity: second, tempo: 0 });
      else if (kind === 0x80 || (kind === 0x90 && second === 0)) events.push({ tick, kind: "off", channel, note: first, velocity: second, tempo: 0 });
    }
    allEvents.push(...events);
    cursor = end;
  }
  allEvents.sort((a, b) => a.tick - b.tick);
  let tempo = 500000;
  let previousTick = 0;
  let elapsed = 0;
  const active = new Map<string, { startSeconds: number; velocity: number; channel: number; note: number }>();
  const notes: MidiNoteEvent[] = [];
  for (const event of allEvents) {
    elapsed += ((event.tick - previousTick) * tempo) / (division * 1_000_000);
    previousTick = event.tick;
    if (event.kind === "tempo") { tempo = event.tempo; continue; }
    const key = `${event.channel}:${event.note}`;
    if (event.kind === "on") active.set(key, { startSeconds: elapsed, velocity: event.velocity, channel: event.channel, note: event.note });
    else {
      const start = active.get(key);
      if (start) {
        notes.push({ ...start, durationSeconds: Math.max(0, elapsed - start.startSeconds) });
        active.delete(key);
      }
    }
  }
  return { format, division, durationSeconds: elapsed, notes };
}

/** Browser player for a selected original `/sa` MIDI slice with looping and master volume. */
export class OriginalMidiPlayer {
  private context?: AudioContext;
  private masterGain?: GainNode;
  private oscillators: OscillatorNode[] = [];
  private loopTimer = 0;
  private playing = false;
  private unsubscribeVolume?: () => void;

  constructor(readonly resource: MidiResource, readonly contentType: string, readonly trackIndex = 0) {}

  start(): void {
    if (this.contentType !== "audio/midi" || typeof window === "undefined") return;
    this.stop();
    this.playing = true;
    this.schedulePass();
    if (!this.unsubscribeVolume) {
      this.unsubscribeVolume = onMasterVolumeChange((vol) => {
        if (this.masterGain && this.context) {
          this.masterGain.gain.setTargetAtTime(vol, this.context.currentTime, 0.03);
        }
      });
    }
  }

  private schedulePass(): void {
    if (!this.playing || typeof window === "undefined") return;
    const ctx = audioManager.getContext();
    if (!ctx) return;
    this.context = ctx;
    const slice = this.resource.bytes.slice(
      this.resource.offsets[this.trackIndex] ?? 0,
      (this.resource.offsets[this.trackIndex + 1] ?? this.resource.bytes.length),
    );
    const sequence = parseStandardMidi(slice);
    if (!this.masterGain) {
      this.masterGain = ctx.createGain();
      this.masterGain.gain.value = getMasterVolume();
      const musicBus = audioManager.getMusicBus() ?? ctx.destination;
      this.masterGain.connect(musicBus);
    }
    if (!this.masterGain) return;
    this.masterGain.gain.setValueAtTime(getMasterVolume(), this.context.currentTime);

    const start = this.context.currentTime + 0.04;
    this.oscillators = [];
    for (const note of sequence.notes) {
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      const dur = Math.max(0.025, note.durationSeconds);
      const t0 = start + note.startSeconds;
      if (note.channel === 9) {
        // Percussion channel: low tribal drum pitch sweep
        oscillator.type = "sine";
        const baseFreq = note.note < 45 ? 110 : note.note < 60 ? 185 : 320;
        oscillator.frequency.setValueAtTime(baseFreq, t0);
        oscillator.frequency.exponentialRampToValueAtTime(Math.max(38, baseFreq * 0.35), t0 + Math.min(0.12, dur));
        const peak = Math.min(0.2, note.velocity / 900);
        gain.gain.setValueAtTime(peak, t0);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + Math.min(0.16, dur));
      } else {
        const types: OscillatorType[] = ["triangle", "sine", "triangle", "sawtooth"];
        oscillator.type = types[note.channel % types.length] ?? "triangle";
        oscillator.frequency.setValueAtTime(440 * 2 ** ((note.note - 69) / 12), t0);
        const scale = oscillator.type === "sawtooth" ? 0.07 : 0.14;
        const peak = Math.min(scale, (note.velocity / 127) * scale);
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.linearRampToValueAtTime(peak, t0 + Math.min(0.015, dur * 0.25));
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      }
      oscillator.connect(gain).connect(this.masterGain);
      oscillator.start(t0);
      oscillator.stop(t0 + dur + 0.01);
      this.oscillators.push(oscillator);
    }

    const loopDelayMs = Math.max(1000, Math.round((sequence.durationSeconds + 0.25) * 1000));
    window.clearTimeout(this.loopTimer);
    this.loopTimer = window.setTimeout(() => {
      if (this.playing) this.schedulePass();
    }, loopDelayMs);
  }

  stop(): void {
    this.playing = false;
    window.clearTimeout(this.loopTimer);
    for (const oscillator of this.oscillators) {
      try { oscillator.stop(); } catch { /* already stopped */ }
    }
    this.oscillators = [];
  }
}

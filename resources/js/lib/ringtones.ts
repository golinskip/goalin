export type RingtoneId = 'classic' | 'chime' | 'digital' | 'bell' | 'zen';

export const RINGTONE_IDS: readonly RingtoneId[] = ['classic', 'chime', 'digital', 'bell', 'zen'] as const;

function toneBurst(
    ctx: AudioContext,
    freq: number,
    start: number,
    duration: number,
    options: { type?: OscillatorType; gain?: number; attack?: number; release?: number } = {},
) {
    const { type = 'sine', gain = 0.3, attack = 0.02, release = duration * 0.6 } = options;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g);
    g.connect(ctx.destination);
    osc.type = type;
    osc.frequency.value = freq;

    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(gain, start + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, start + attack + release);

    osc.start(start);
    osc.stop(start + attack + release + 0.02);
}

function playClassic(ctx: AudioContext): number {
    const now = ctx.currentTime;
    const frequencies = [880, 1108.73, 880, 1108.73, 880];
    const noteDuration = 0.15;
    const gap = 0.08;

    frequencies.forEach((freq, i) => {
        const start = now + i * (noteDuration + gap);
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.connect(g);
        g.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        g.gain.setValueAtTime(0, start);
        g.gain.linearRampToValueAtTime(0.3, start + 0.02);
        g.gain.linearRampToValueAtTime(0, start + noteDuration);
        osc.start(start);
        osc.stop(start + noteDuration);
    });

    return frequencies.length * (noteDuration + gap);
}

function playChime(ctx: AudioContext): number {
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    const step = 0.12;

    notes.forEach((freq, i) => {
        toneBurst(ctx, freq, now + i * step, 0.5, {
            type: 'triangle',
            gain: 0.25,
            release: 0.55,
        });
    });

    return notes.length * step + 0.55;
}

function playDigital(ctx: AudioContext): number {
    const now = ctx.currentTime;
    const freq = 1320;
    const duration = 0.12;

    [0, 0.2].forEach((offset) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.connect(g);
        g.connect(ctx.destination);
        osc.type = 'square';
        osc.frequency.value = freq;
        const start = now + offset;
        g.gain.setValueAtTime(0, start);
        g.gain.linearRampToValueAtTime(0.18, start + 0.01);
        g.gain.setValueAtTime(0.18, start + duration - 0.02);
        g.gain.linearRampToValueAtTime(0, start + duration);
        osc.start(start);
        osc.stop(start + duration);
    });

    return 0.45;
}

function playBell(ctx: AudioContext): number {
    const now = ctx.currentTime;
    const fundamentals = [523.25, 1046.5, 1567.98];

    fundamentals.forEach((freq, i) => {
        toneBurst(ctx, freq, now, 1.6, {
            type: 'sine',
            gain: i === 0 ? 0.35 : 0.12 / (i + 1),
            attack: 0.005,
            release: 1.6,
        });
    });

    return 1.8;
}

function playZen(ctx: AudioContext): number {
    const now = ctx.currentTime;
    toneBurst(ctx, 432, now, 2.4, {
        type: 'sine',
        gain: 0.22,
        attack: 0.4,
        release: 1.8,
    });
    toneBurst(ctx, 864, now + 0.05, 2.2, {
        type: 'sine',
        gain: 0.06,
        attack: 0.5,
        release: 1.6,
    });

    return 2.6;
}

export function playRingtone(id: RingtoneId): () => void {
    const ctx = new AudioContext();
    let duration = 0.5;

    switch (id) {
        case 'chime':
            duration = playChime(ctx);
            break;
        case 'digital':
            duration = playDigital(ctx);
            break;
        case 'bell':
            duration = playBell(ctx);
            break;
        case 'zen':
            duration = playZen(ctx);
            break;
        case 'classic':
        default:
            duration = playClassic(ctx);
            break;
    }

    const timeout = window.setTimeout(() => {
        ctx.close().catch(() => undefined);
    }, (duration + 0.5) * 1000);

    return () => {
        window.clearTimeout(timeout);
        ctx.close().catch(() => undefined);
    };
}

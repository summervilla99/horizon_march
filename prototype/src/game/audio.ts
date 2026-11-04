import seaUrl from '../assets/audio/sea.mp3'
import hornUrl from '../assets/audio/horn.mp3'
import daepanUrl from '../assets/audio/daepan.mp3'
import akikoUrl from '../assets/audio/akiko.mp3'
import cheongokUrl from '../assets/audio/cheongok.mp3'
import chulbyeongUrl from '../assets/audio/chulbyeong.mp3'
import edUrl from '../assets/audio/ed.mp3'
import gyokuonUrl from '../assets/audio/gyokuon.mp3'

export type Bgm = 'daepan' | 'akiko' | 'cheongok' | 'chulbyeong' | 'ed'

const URLS = {
  sea: seaUrl,
  horn: hornUrl,
  daepan: daepanUrl,
  akiko: akikoUrl,
  cheongok: cheongokUrl,
  chulbyeong: chulbyeongUrl,
  ed: edUrl,
  gyokuon: gyokuonUrl,
} as const
type Id = keyof typeof URLS

const BGM_VOL = 0.6

interface Chan {
  el: HTMLAudioElement
  gain: GainNode
}

/**
 * Streams the tracks through <audio> elements (so the 16 MB of music isn't decoded up front) and
 * routes them via WebAudio gain nodes (so fades also work on iOS, where element.volume is read-only).
 * Lives outside any Phaser scene: music keeps playing across scene changes, and asking for the
 * track that is already playing is a no-op, so scenes can state what they want without restarting it.
 */
class AudioManager {
  private ctx: AudioContext | null = null
  private chans = new Map<Id, Chan>()
  private bgmId: Bgm | null = null
  private ambVol = 0
  muted = false

  private context() {
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      this.ctx = new AC()
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume().catch(() => undefined)
    return this.ctx
  }

  /** Call from a user gesture (any tap) so the browser lets sound start. */
  unlock() {
    try {
      this.context()
    } catch {
      /* no audio support */
    }
  }

  private chan(id: Id): Chan | null {
    let c = this.chans.get(id)
    if (c) return c
    try {
      const ctx = this.context()
      const el = new Audio(URLS[id])
      el.preload = 'auto'
      el.loop = id !== 'horn' && id !== 'gyokuon'
      const src = ctx.createMediaElementSource(el)
      const gain = ctx.createGain()
      gain.gain.value = 0
      src.connect(gain).connect(ctx.destination)
      c = { el, gain }
      this.chans.set(id, c)
      return c
    } catch {
      return null
    }
  }

  private fade(c: Chan, to: number, ms: number, stopAfter = false) {
    const g = c.gain.gain
    const now = this.ctx!.currentTime
    g.cancelScheduledValues(now)
    g.setValueAtTime(g.value, now)
    g.linearRampToValueAtTime(this.muted ? 0 : to, now + Math.max(0.02, ms / 1000))
    if (stopAfter) {
      window.setTimeout(() => {
        if (c.gain.gain.value < 0.01) c.el.pause()
      }, ms + 80)
    }
  }

  private start(id: Id, vol: number, ms: number, restart = false) {
    const c = this.chan(id)
    if (!c) return null
    if (restart) c.el.currentTime = 0
    if (c.el.paused) void c.el.play().catch(() => undefined)
    this.fade(c, vol, ms)
    return c
  }

  /** The background music track (one at a time, crossfaded). null fades it out. */
  bgm(id: Bgm | null, ms = 1600, vol = BGM_VOL) {
    if (id === this.bgmId) {
      if (id) this.start(id, vol, ms)
      return
    }
    if (this.bgmId) {
      const old = this.chans.get(this.bgmId)
      if (old) this.fade(old, 0, ms, true)
    }
    this.bgmId = id
    if (id) this.start(id, vol, ms, true)
  }

  /** The sea-wash bed. vol 0 fades it out. */
  sea(vol: number, ms = 1800) {
    this.ambVol = vol
    if (vol <= 0) {
      const c = this.chans.get('sea')
      if (c) this.fade(c, 0, ms, true)
    } else this.start('sea', vol, ms)
  }

  /** Ship's horn etc. — plays once from the top. */
  horn(vol = 0.8) {
    this.start('horn', vol, 30, true)
  }

  /**
   * The 옥음방송 radio broadcast. Everything else ducks underneath it; resolves when it ends
   * (or when fadeOutVoice() cuts it). Never rejects, and resolves at once if audio is unavailable.
   */
  voice(): Promise<void> {
    const c = this.start('gyokuon', 1, 400, true)
    if (!c) return Promise.resolve()
    this.bgm(null, 800)
    this.sea(Math.min(this.ambVol, 0.1), 800)
    return new Promise((resolve) => {
      const done = () => resolve()
      c.el.addEventListener('ended', done, { once: true })
    })
  }

  fadeOutVoice(ms = 2200) {
    const c = this.chans.get('gyokuon')
    if (c) this.fade(c, 0, ms, true)
  }

  /** Silence everything (title screen, end of game). */
  stopAll(ms = 700) {
    this.bgmId = null
    this.ambVol = 0
    for (const c of this.chans.values()) this.fade(c, 0, ms, true)
  }

  toggleMute() {
    this.muted = !this.muted
    for (const [id, c] of this.chans) {
      const target = this.muted ? 0 : id === 'sea' ? this.ambVol : id === this.bgmId ? BGM_VOL : c.gain.gain.value
      this.fade(c, target, 200)
    }
    return this.muted
  }
}

export const audio = new AudioManager()

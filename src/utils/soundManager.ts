import { Audio, AVPlaybackStatus } from 'expo-av';
import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from './constants';

// Two worship tracks that alternate. Add more entries to extend the queue.
const TRACKS = [
  require('../../assets/audio/worship-background.mp3'),
  require('../../assets/audio/worship-background-2.mp3'),
] as const;

const MUSIC_VOLUME = 0.25;
// Fast crossfade at track boundaries (2026-07-11 rework):
// - the NEXT track is PRELOADED once the current one is 80% complete (or in its
//   final 5s), so the switch is instant — no createAsync gap of silence
// - fade OUT runs over the final 2s of the current track
// - fade IN of the preloaded track takes 1.5s
const FADE_OUT_MS = 2000;
const FADE_IN_MS = 1500;
const PRELOAD_REMAINING_MS = 5000; // also preload when < 5s remain
const FADE_STEP_MS = 100;

class SoundManager {
  private openSound: Audio.Sound | null = null;
  private backgroundMusic: Audio.Sound | null = null;
  private isMusicPlaying: boolean = false;
  private isLoadingMusic: boolean = false;
  private musicEnabled: boolean = true;

  // Which track is currently loaded (0-based index into TRACKS)
  private currentTrackIndex: number = 0;
  // Listeners that receive track-change notifications (used by MusicIndicator)
  private trackListeners: Array<(index: number) => void> = [];

  // Fade state — one timer at a time; cleared on stop/pause/track change
  private fadeTimer: ReturnType<typeof setInterval> | null = null;
  private isFadingOut: boolean = false;

  // Next track preloaded ahead of time so the switch is instant
  private preloadedSound: Audio.Sound | null = null;
  private preloadedIndex: number = -1;
  private isPreloading: boolean = false;

  private _clearFade() {
    if (this.fadeTimer) {
      clearInterval(this.fadeTimer);
      this.fadeTimer = null;
    }
    this.isFadingOut = false;
  }

  /** Ramp a sound's volume from `from` to `to` over `durationMs`. */
  private _fadeVolume(sound: Audio.Sound, from: number, to: number, durationMs: number) {
    this._clearFade();
    const steps = Math.max(1, Math.round(durationMs / FADE_STEP_MS));
    let step = 0;
    sound.setVolumeAsync(from).catch(() => {});
    this.fadeTimer = setInterval(() => {
      step += 1;
      const v = from + ((to - from) * step) / steps;
      sound.setVolumeAsync(Math.max(0, Math.min(1, v))).catch(() => {});
      if (step >= steps && this.fadeTimer) {
        clearInterval(this.fadeTimer);
        this.fadeTimer = null;
      }
    }, FADE_STEP_MS);
  }

  // ── Initialisation ──────────────────────────────────────────────────────────

  async initialize() {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        // true = worship music plays even when the iPhone's physical ring/silent
        // switch is on silent — with false, most iPhones hear nothing at all.
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
    } catch (error) {
      console.log('Audio init error:', error);
    }
    try {
      const stored = await SecureStore.getItemAsync(STORAGE_KEYS.musicEnabled);
      if (stored !== null) {
        this.musicEnabled = stored === 'true';
      }
    } catch {
      // default to enabled
    }
  }

  // ── Splash chime ────────────────────────────────────────────────────────────
  // Replace app-open.mp3 with a proper 2–3 sec chime when available.
  // Currently uses worship-background.mp3 as fallback, auto-stopped at 3 sec.
  async playAppOpen() {
    try {
      if (this.openSound) {
        await this.openSound.unloadAsync();
        this.openSound = null;
      }
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/audio/app-open.mp3'),
        { volume: 0.8, shouldPlay: true },
      );
      this.openSound = sound;

      const stopTimeout = setTimeout(async () => {
        try {
          if (this.openSound) {
            await this.openSound.stopAsync();
            await this.openSound.unloadAsync();
            this.openSound = null;
          }
        } catch { /* ignore */ }
      }, 3000);

      sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
        if (status.isLoaded && status.didJustFinish) {
          clearTimeout(stopTimeout);
          sound.unloadAsync();
          this.openSound = null;
        }
      });
    } catch (error) {
      console.log('App open sound error:', error);
    }
  }

  // ── Background music ────────────────────────────────────────────────────────

  async playBackgroundMusic() {
    try {
      if (!this.musicEnabled) return;
      // Triple guard: already playing, loading, or a sound object already exists (paused)
      if (this.isMusicPlaying || this.isLoadingMusic || this.backgroundMusic !== null) return;

      this.isLoadingMusic = true;
      await this._loadAndPlayTrack(this.currentTrackIndex);
      this.isLoadingMusic = false;
    } catch (error) {
      this.isLoadingMusic = false;
      console.log('Background music error:', error);
    }
  }

  /** Load the next track into memory (paused, silent) so the switch is instant. */
  private async _preloadTrack(index: number) {
    if (this.isPreloading || this.preloadedIndex === index) return;
    this.isPreloading = true;
    try {
      // Drop a stale preload of a different track
      if (this.preloadedSound) {
        await this.preloadedSound.unloadAsync().catch(() => {});
        this.preloadedSound = null;
        this.preloadedIndex = -1;
      }
      const { sound } = await Audio.Sound.createAsync(
        TRACKS[index],
        { volume: 0, shouldPlay: false, isLooping: false, progressUpdateIntervalMillis: 500 },
      );
      this.preloadedSound = sound;
      this.preloadedIndex = index;
    } catch {
      this.preloadedSound = null;
      this.preloadedIndex = -1;
    } finally {
      this.isPreloading = false;
    }
  }

  private async _loadAndPlayTrack(index: number) {
    // Unload any existing sound before starting the next one
    this._clearFade();
    if (this.backgroundMusic) {
      try {
        await this.backgroundMusic.stopAsync();
        await this.backgroundMusic.unloadAsync();
      } catch { /* ignore */ }
      this.backgroundMusic = null;
      this.isMusicPlaying = false;
    }

    this.currentTrackIndex = index;
    this._notifyTrackListeners(index);

    let sound: Audio.Sound;
    if (this.preloadedSound && this.preloadedIndex === index) {
      // Instant switch — the track is already decoded in memory
      sound = this.preloadedSound;
      this.preloadedSound = null;
      this.preloadedIndex = -1;
      await sound.playAsync();
    } else {
      const created = await Audio.Sound.createAsync(
        TRACKS[index],
        {
          volume: 0,                  // starts silent; fades in below
          shouldPlay: true,
          isLooping: false,           // we handle looping manually to enable track switching
          progressUpdateIntervalMillis: 500,
          shouldCorrectPitch: false,
        },
      );
      sound = created.sound;
    }

    this.backgroundMusic = sound;
    this.isMusicPlaying = true;

    // Fade the new track in — fast (1.5s)
    this._fadeVolume(sound, 0, MUSIC_VOLUME, FADE_IN_MS);

    // Preload ahead + fade out over the final 2s, then advance instantly
    sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
      if (!status.isLoaded) return;

      if (status.didJustFinish) {
        this.isFadingOut = false;
        const nextIndex = (index + 1) % TRACKS.length;
        this._loadAndPlayTrack(nextIndex).catch(() => {});
        return;
      }

      if (!status.isPlaying || typeof status.durationMillis !== 'number') return;
      const remaining = status.durationMillis - status.positionMillis;

      // Preload the next track once 80% complete (or inside the final 5s)
      const eightyPct = status.positionMillis >= status.durationMillis * 0.8;
      if ((eightyPct || remaining <= PRELOAD_REMAINING_MS) && !this.isPreloading) {
        const nextIndex = (index + 1) % TRACKS.length;
        if (this.preloadedIndex !== nextIndex) {
          this._preloadTrack(nextIndex).catch(() => {});
        }
      }

      // Begin the fade-out inside the final 2s window
      if (
        !this.isFadingOut &&
        status.durationMillis > FADE_OUT_MS * 2 && // skip fade-out on very short clips
        remaining <= FADE_OUT_MS + FADE_STEP_MS
      ) {
        this.isFadingOut = true;
        this._fadeVolume(sound, MUSIC_VOLUME, 0, FADE_OUT_MS);
      }
    });
  }

  async stopBackgroundMusic() {
    try {
      this._clearFade();
      if (this.backgroundMusic) {
        await this.backgroundMusic.stopAsync();
        await this.backgroundMusic.unloadAsync();
        this.backgroundMusic = null;
        this.isMusicPlaying = false;
      }
      if (this.preloadedSound) {
        await this.preloadedSound.unloadAsync().catch(() => {});
        this.preloadedSound = null;
        this.preloadedIndex = -1;
      }
    } catch (error) {
      console.log('Stop music error:', error);
    }
  }

  async pauseBackgroundMusic() {
    try {
      this._clearFade();
      if (this.backgroundMusic && this.isMusicPlaying) {
        await this.backgroundMusic.pauseAsync();
        this.isMusicPlaying = false;
      }
    } catch (error) {
      console.log('Pause music error:', error);
    }
  }

  async resumeBackgroundMusic() {
    try {
      // No-op when stopped by toggle (backgroundMusic is null)
      if (this.backgroundMusic && !this.isMusicPlaying) {
        // If we paused mid-fade the volume could be anywhere — restore it
        await this.backgroundMusic.setVolumeAsync(MUSIC_VOLUME).catch(() => {});
        await this.backgroundMusic.playAsync();
        this.isMusicPlaying = true;
      }
    } catch (error) {
      console.log('Resume music error:', error);
    }
  }

  // ── Track info (for MusicIndicator) ────────────────────────────────────────

  getCurrentTrackIndex(): number {
    return this.currentTrackIndex;
  }

  getTotalTracks(): number {
    return TRACKS.length;
  }

  onTrackChange(listener: (index: number) => void): () => void {
    this.trackListeners.push(listener);
    return () => {
      this.trackListeners = this.trackListeners.filter((l) => l !== listener);
    };
  }

  private _notifyTrackListeners(index: number) {
    this.trackListeners.forEach((l) => {
      try { l(index); } catch { /* ignore */ }
    });
  }

  // ── Preference ──────────────────────────────────────────────────────────────

  getMusicPlaying(): boolean {
    return this.isMusicPlaying;
  }

  isMusicEnabled(): boolean {
    return this.musicEnabled;
  }

  setMusicEnabled(enabled: boolean): void {
    this.musicEnabled = enabled;
  }

  // ── Cleanup ─────────────────────────────────────────────────────────────────

  async unloadAll() {
    await this.stopBackgroundMusic();
    if (this.openSound) {
      await this.openSound.unloadAsync().catch(() => {});
      this.openSound = null;
    }
  }
}

export const soundManager = new SoundManager();

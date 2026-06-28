import { Audio, AVPlaybackStatus } from 'expo-av';
import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from './constants';

// Two worship tracks that alternate. Add more entries to extend the queue.
const TRACKS = [
  require('../../assets/audio/worship-background.mp3'),
  require('../../assets/audio/worship-background-2.mp3'),
] as const;

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

  // ── Initialisation ──────────────────────────────────────────────────────────

  async initialize() {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: false,
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

  private async _loadAndPlayTrack(index: number) {
    // Unload any existing sound before loading the next one
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

    const { sound } = await Audio.Sound.createAsync(
      TRACKS[index],
      {
        volume: 0.25,
        shouldPlay: true,
        isLooping: false,           // we handle looping manually to enable track switching
        progressUpdateIntervalMillis: 1000,
        shouldCorrectPitch: false,
      },
    );

    this.backgroundMusic = sound;
    this.isMusicPlaying = true;

    // When a track finishes naturally, advance to the next track
    sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
      if (status.isLoaded && status.didJustFinish) {
        const nextIndex = (index + 1) % TRACKS.length;
        this._loadAndPlayTrack(nextIndex).catch(() => {});
      }
    });
  }

  async stopBackgroundMusic() {
    try {
      if (this.backgroundMusic) {
        await this.backgroundMusic.stopAsync();
        await this.backgroundMusic.unloadAsync();
        this.backgroundMusic = null;
        this.isMusicPlaying = false;
      }
    } catch (error) {
      console.log('Stop music error:', error);
    }
  }

  async pauseBackgroundMusic() {
    try {
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

import { Audio } from 'expo-av';

class SoundManager {
  private openSound: Audio.Sound | null = null;
  private backgroundMusic: Audio.Sound | null = null;
  private isMusicPlaying: boolean = false;
  // Guards against two concurrent callers both passing the isMusicPlaying check
  // before either one sets it to true (which would create two audio streams).
  private isLoadingMusic: boolean = false;

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
  }

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
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
          this.openSound = null;
        }
      });
    } catch (error) {
      console.log('App open sound error:', error);
    }
  }

  async playBackgroundMusic() {
    try {
      if (this.isMusicPlaying || this.isLoadingMusic) return;
      // Already loaded but paused — just resume
      if (this.backgroundMusic) {
        await this.backgroundMusic.playAsync();
        this.isMusicPlaying = true;
        return;
      }
      this.isLoadingMusic = true;
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/audio/worship-background.mp3'),
        {
          volume: 0.25,
          shouldPlay: true,
          isLooping: true,
        },
      );
      this.backgroundMusic = sound;
      this.isMusicPlaying = true;
      this.isLoadingMusic = false;
    } catch (error) {
      this.isLoadingMusic = false;
      console.log('Background music error:', error);
    }
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
      if (this.backgroundMusic) {
        await this.backgroundMusic.pauseAsync();
        this.isMusicPlaying = false;
      }
    } catch (error) {
      console.log('Pause music error:', error);
    }
  }

  async resumeBackgroundMusic() {
    try {
      // backgroundMusic is null when stopped (toggle OFF) — this becomes a no-op
      if (this.backgroundMusic) {
        await this.backgroundMusic.playAsync();
        this.isMusicPlaying = true;
      }
    } catch (error) {
      console.log('Resume music error:', error);
    }
  }

  getMusicPlaying(): boolean {
    return this.isMusicPlaying;
  }

  async unloadAll() {
    await this.stopBackgroundMusic();
    if (this.openSound) {
      await this.openSound.unloadAsync();
      this.openSound = null;
    }
  }
}

export const soundManager = new SoundManager();

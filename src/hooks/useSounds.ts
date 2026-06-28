import { soundManager } from '../utils/soundManager';
import { useSoundStore } from '../store/soundStore';

export const useSounds = () => {
  const { musicEnabled, setMusicEnabled } = useSoundStore();

  return {
    playAppOpen: () => soundManager.playAppOpen(),
    playBackgroundMusic: () => soundManager.playBackgroundMusic(),
    stopBackgroundMusic: () => soundManager.stopBackgroundMusic(),
    pauseBackgroundMusic: () => soundManager.pauseBackgroundMusic(),
    resumeBackgroundMusic: () => soundManager.resumeBackgroundMusic(),
    isMusicPlaying: () => soundManager.getMusicPlaying(),
    setMusicEnabled: (enabled: boolean) => {
      setMusicEnabled(enabled);
      if (enabled) {
        soundManager.playBackgroundMusic();
      } else {
        soundManager.stopBackgroundMusic();
      }
    },
    isMusicEnabled: () => musicEnabled,
  };
};

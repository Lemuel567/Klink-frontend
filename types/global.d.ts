/**
 * Ambient declarations for React Native runtime globals that aren't in the
 * default Expo/React Native type surface. This file has no imports/exports so
 * it is treated as a global script and its declarations augment global scope.
 */

interface ErrorUtilsStatic {
  setGlobalHandler(callback: (error: Error, isFatal?: boolean) => void): void;
  getGlobalHandler(): ((error: Error, isFatal?: boolean) => void) | undefined;
}

// React Native's global error handler, used in app/_layout.tsx to catch
// otherwise-silent unhandled JS exceptions.
declare var ErrorUtils: ErrorUtilsStatic | undefined;

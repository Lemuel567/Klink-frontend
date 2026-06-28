# Audio Files Needed

Place these two files in this folder before running `npx expo start`.
Metro bundler requires both MP3 files to be present at build time.

## 1. app-open.mp3
Search on: pixabay.com/music
Search terms: "church bell" or "worship chime" or "spiritual opening"
Duration needed: 2 to 3 seconds
Download the MP3 and rename to app-open.mp3

## 2. worship-background.mp3
Search on: pixabay.com/music
Search terms: "worship ambient" or "gospel instrumental" or "christian ambient"
Duration needed: 3 minutes minimum
Make sure it is labeled free for commercial use
Download the MP3 and rename to worship-background.mp3

Both files must be MP3 format.
Place both files in this assets/audio/ folder.

## IMPORTANT
Both files must exist here before you run `npx expo start`.
If they are missing, Metro will fail to bundle the app.
The soundManager wraps all playback in try-catch so corrupt or
undecodable files will silently degrade without crashing the app.

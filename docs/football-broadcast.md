# Play-by-play announcer

Touchdown Rush now plays 200 complete announcer clips across all 47 observed
football event categories. This replaces the device's default text-to-speech
voice. Archer approved the new voice sample before completion of this bank.
The clips use Kokoro's `am_michael` voice at speed 1.07, generated offline from
original Archerbox copy. These are synthetic recordings, not a human announcer
or an impersonation of a real sportscaster. No model, voice runtime, microphone,
API key or paid speech service is needed by the game.

## Calls and facts

The existing `CommentaryDirector` reads actual match state without changing the
simulation. It covers snaps, handoffs, QB runs and sneaks, pressure, throws,
catches, incomplete-pass causes, interceptions, first downs, gains/losses,
sacks, sidelines, turnovers on downs, touchdowns, return touchdowns, punts,
kickoffs, returns, touchbacks, field goals, extra points, misses, the last minute
and the final whistle. It respects multiplayer's reversed physical direction.

Each category rotates without replacement and avoids an immediate repeat when
a new shuffle starts. Calls are whole sentences. Names, scores, down, distance
and exact yardage stay in the existing game HUD; recordings do not splice names
or numbers into sentences. The displayed announcer caption is the exact text
of the clip that starts playing. Calls do not invent penalties, routes, injury
diagnoses, official timeouts or quarters.

## Audio lifecycle

`recorded-speech.js` uses Web Audio. A user click creates/resumes the audio
context before asynchronous fetching. Only one call plays and at most one waits.
Each call has a short expiry window. Slow downloads and pending calls are
checked again before playback; an old catch cannot be announced late. Important
scores and interceptions can interrupt routine chatter. Generation guards keep
cancelled downloads and late `onended` callbacks from affecting newer calls.
A watchdog handles hung requests. Decoded buffers are cached with a 36-clip cap.

Mute, volume-zero, pause, hidden tabs, menus and leaving the game cancel audio
immediately, including clips still loading. Resume observes fresh state and
never replays missed plays. Volume changes affect the clip already playing.
The sample button cycles through labeled touchdown, interception, first-down
and field-goal examples. Settings persist locally; older device-voice settings
are ignored. There is no silent fallback to the rejected device voice. Loading
or decoding failures show a retry message. Browsers without Web Audio disable
the announcer controls. Captions are optional and follow actual playback.

## Asset preparation and provenance

- [Kokoro ONNX implementation](https://github.com/thewh1teagle/kokoro-onnx), version
  0.6.1, MIT. Used only during offline preparation.
- [Official model files v1.1 release](https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.1),
  `kokoro-v1.0.onnx` and `voices-v1.0.bin`.
- [Kokoro model](https://huggingface.co/hexgrad/Kokoro-82M), Apache 2.0.
  [Voice provenance](https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md)
  describes `am_michael`. Model/voice files remain outside the repository.
- Original lines: `scripts/data/football-studio-lines.json`.
- Generator: `scripts/generate-football-announcer.py`; needs Python 3.12,
  `kokoro-onnx==0.6.1`, soundfile, ffmpeg and ffprobe. It validates samples,
  normalizes loudness to -18 LUFS with a -2 dB true-peak target, and writes mono
  24 kHz, 80 kbps MP3 clips and a manifest with text and measured durations.

Rebuild with local model paths (do not commit the models):

```sh
python scripts/generate-football-announcer.py \
  --model /path/to/kokoro-v1.0.onnx \
  --voices /path/to/voices-v1.0.bin \
  --ffmpeg /path/to/ffmpeg --threads 1
```

The content-derived filenames allow HTTP caching and skip already completed
clips when generation resumes. If changing model or encoding settings, remove
the old generated bank before rebuilding to avoid mixing provenance.

## Verification

```sh
node --test tests/football-announcer-assets.test.mjs tests/football-recorded-announcer.test.mjs tests/football-broadcast.test.mjs tests/football.test.mjs tests/multiplayer.test.mjs tests/bundle.test.mjs
```

Coverage checks every event has recordings, files and exact captions; real game
outcomes; no simulation mutation; reversed friend perspectives; shuffle
boundaries; gesture activation; async cancellation; stale downloads; priorities;
volume; pending expiry; watchdogs; and error recovery without device TTS.
Browser QA checks decoding and actual sample/live playback, mute/pause and the
announcer controls in desktop and phone layouts.

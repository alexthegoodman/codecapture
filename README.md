# CodeCapture

### Setup

- Create a `/generated/` subdirectory here in the repo, along with a subdirectory for each file you process.
- Update constants in `index.js`, `audio.js` and `video.js` to your target file and subdirectory
- You may also need to figure out the duration (in frames) of your resulting video and hardcode that into `remotion/Root.jsx` near the bottom

- `npm run generate` to generate scripts and matching screenshot files
- Manually edit your scripts to your liking (perhaps better prompts will improve time spent on this task)
- `npm run audio` to generate an mp3 for each script / screenshot pair using openai
- `npm run video` to generate finished video

Based on my estimates and depending on which models you use, a typical 30 minute video could cost anywhere from $0.50 - $2.00 to generate.

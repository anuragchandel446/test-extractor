# TTS Reader — Simple Web Speech API demo

This small project is a vanilla HTML/CSS/JS Text-to-Speech reader using the browser's Web Speech API.

Files
- `kc.html` — The UI for the reader
- `kc.css` — Styling
- `kc.js` — TTS logic, voice selection, controls, highlighting, persistence

How to run
1. Open `kc.html` in a modern desktop browser (Chrome, Edge, Firefox, Safari). Example: double-click the file or serve it with a simple static server.

Quick test
1. Type or paste text in the textarea.
2. Choose a voice from the Voice dropdown (browser will populate available system voices).
3. Press Play — the text should speak.
	 - If the audio sounds choppy, robotic, or has odd pacing you can improve quality by:
		 - Clicking the **Suggest best voice** button to let the app pick a higher-quality voice (Chrome/Edge often provide Google WaveNet/Neural voices; macOS has polished voices like Alex/Samantha).
		 - Increasing the **Sentence pause** slider to 150–300 ms to reduce clipping and make playback smoother for longer or complex text.
4. Use Pause/Resume or Stop to control playback.
5. Toggle word highlighting to see the text highlighted while it's being read.

Extras & tips
- Voice preview — use the "Preview" button (next to the voice dropdown) to play a short sample using the currently selected voice so you can quickly judge quality.
 - Voice preview — use the "Preview" button (next to the voice dropdown) to play a short sample using the currently selected voice so you can quickly judge quality.
- Read from cursor — use the "Read from cursor" button (next to the playback controls) to start reading from where your caret is placed (or read only the current selection).
- Adaptive chunking — the reader now breaks long text into short segments automatically and adapts the segment length based on speaking rate and the sentence pause setting; this usually reduces clipping and improves pacing.

Debugging voices
- If you still hear a male voice after preferring female, click "List voices" — that will show the full list of voices your browser reports. If there are no female voices present, the app cannot magically make the voice female; you'll either need to install system voices or use a remote/cloud voice provider.

Voice gender preference
- You can now choose a preferred voice gender using the new "Preferred gender" select (Any / Female / Male). This is a heuristic — browsers don't always expose explicit gender data for voices, so the app matches common female/male voice names (for example, Samantha, Salli, Amy are commonly female names in many TTS sets; Alex is often a male macOS voice).
- If the selected gender has no matches on your system, the app falls back to any available voice.

Strict gender preference
- You can now require the chosen gender strictly by enabling the "Require preferred gender (no fallback)" checkbox. When checked the voice dropdown will only show voices matching your chosen gender; if none are available the list will remain empty (this is intentional since you requested strict behavior). Uncheck the box to allow the app to fall back to any available voice.

Behaviour notes
- When you press Play and a voice is selected that doesn't match your preference, the app will try to automatically pick a matching voice. If you checked "Require preferred gender (no fallback)" and no voices matching that gender are available, playback will be blocked and you'll see a message telling you that no matches exist. This is intentional to respect the strict preference.

Keyboard shortcuts
- Space: Play / Pause
- S: Stop
- L: Load sample text

Notes & compatibility
- The app uses the Web Speech API (speechSynthesis). Support varies across browsers (desktop Chrome/Edge have good support; Firefox/Safari support is improving but may behave differently).
- If no voices are available immediately, try reloading the page — or check your browser settings for speech/voice options.

Enjoy! If you'd like, I can extend this to support saving audio files or reading web pages directly.

UI theme
- The app now uses a soft pastel UI theme and a friendly display font for a cleaner reading experience. If you'd prefer a different color palette or a dark theme I can add a toggle for that.
UI theme
- The app now has a dark — glassy, neon-accent visual theme and improved controls to match a modern TTS app layout. If you prefer a different look (light/pastel) I can add a theme toggle and presets.

Background animation
- This release adds an automatic RGB-style animated background. Use the "Animated background" toggle in the controls (right panel) to enable/disable the animation and the Speed slider to adjust how fast the colors rotate. The animation persists across reloads.
 - The animated background now uses multiple layered blobs — by default the color palette is set to a calm blue‑gray tone (for a consistent look). Use the Speed slider to tune motion; you can still toggle the animation off to keep a static blue-gray background.

Read text from an image (OCR)
- You can now upload an image and extract any visible text with OCR (Tesseract.js). Use the "OCR & Extract" button in the editor area. Recognized text is appended into the editor, and you can optionally enable "Auto speak" to immediately read the extracted text aloud.
 - The animated background can be made more vibrant by increasing the Speed setting; the app also features a 'twinkle' stars overlay when enabled. Try values 1.2–2.0 for a vivid animated look.

Translation
- You can translate text in the editor to another language using the built-in Translate controls below the OCR area. Select a target language and click `Translate`.
- The app uses a public LibreTranslate endpoint by default (`https://translate.argosopentech.com/translate`). This requires no API key for casual use but may be rate-limited. If you run your own LibreTranslate instance or prefer another provider, update the `LIBRE_TRANSLATE_ENDPOINT` constant in `kc.js`.
- Options: check `Replace` to replace the current selection (or whole text if nothing selected) with the translation, and `Speak` to read the translated text aloud after translation.
- Note: translation quality depends on the service; for production or high-volume use consider using a paid provider (DeepL, Google Translate API, Microsoft Translator) and update the code to include your API key/credentials.

Voice input (speech-to-text)
- The app now supports voice input using the browser's Speech Recognition (in Chrome this uses Google's backend). Use the `Voice Input` controls below the Translate area: choose a language, click `Start Voice Input`, and speak — the recognized text will be appended (or replace selection if `Replace` is checked).
- This feature uses the Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`) which is available in Chromium-based browsers (Chrome, Edge). If your browser does not support it, the UI will indicate "not supported".
- The recognition language is persisted between sessions.

Login
- This project now includes a simple client-side `login.html`. It's a demo-only, client-side login: when you sign in the app stores a localStorage flag `kc_logged_in` and allows access to `kc.html`.
- There is also a `Logout` button in the header which clears the flag and returns you to the login page.
- Note: this is not secure authentication — it's a convenience wrapper for the demo UI. For real apps, integrate a proper authentication backend.

Logo
- The app now uses your supplied "Moon Stoners" logo stored at `assets/moon-stoners.png`. It is referenced in both `kc.html` and `login.html` as the app header logo.

Read text from a photo
- You can now capture a photo or drop an image to extract text. Use the `📷 Use Camera` button to take a picture on devices that support it, or drag & drop an image onto the drop zone next to the OCR controls.
- After taking/dropping an image you will see a preview; click `OCR & Extract` to extract text and append it to the editor. If `Auto speak` is enabled the recognized text will be read aloud automatically.
- Camera capture uses the browser's file input capture flag. On desktop, clicking the camera button opens your file picker; on mobile it will usually open the camera app.

Play OCR results
- There's now a small Play button on the image preview — click it to play the most recent OCR result. If no OCR result is available the Play button will read the current editor text.

Auto-format transcript
- There's an `Auto-format` option in the Voice Input controls — when enabled, short heuristics will try to tidy final transcripts by trimming whitespace, capitalizing the first letter of each line, and ensuring sentences end with punctuation (a period, exclamation, or question mark). This gives cleaner output for quick dictation but is intentionally simple; if you want smarter punctuation (commas, multi-sentence splits, spoken punctuation words handling) I can add more advanced rules or integrate a server-side post-processor.

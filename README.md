# Speak & Translate Simple

A speech-to-speech translation Progressive Web App (PWA) built with Vue 3 and Vite. Record audio, transcribe it using Voxtral, translate it to your target language, and play back the translation using Google Text-to-Speech.

## Features

- Voice recording with real-time audio visualization
- Automatic transcription via Voxtral API
- Translation to 35+ languages
- Text-to-speech playback (Browser & Google TTS)
- Conversation history stored locally (IndexedDB)
- PWA support for offline-capable installation
- Automatic update detection with user-controlled updates
- Mobile-first responsive design

## Tech Stack

- **Framework**: Vue 3 (Composition API, `<script setup>`)
- **Build Tool**: Vite 7
- **Language**: TypeScript
- **State Management**: Pinia
- **Persistence**: Dexie.js (IndexedDB)
- **Styling**: Vanilla CSS (mobile-first approach)
- **Icons**: lucide-vue-next
- **Audio**: Wavesurfer.js, Web Audio API
- **Animations**: GSAP

## Requirements

- **Node.js**: v22.x or higher
- **Google Cloud API Key**: Required for Text-to-Speech functionality

## Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd speak-and-translate-simple
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**

   Create a `.env` file in the project root:
   ```env
   GOOGLE_CLOUD_API_KEY=your_google_cloud_api_key_here
   ```

   The Google Cloud API key is used for Text-to-Speech synthesis via the local development proxy.

4. **Start the development server**
   ```bash
   npm run dev
   ```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview production build locally |

## Project Structure

```
src/
├── assets/          # CSS and static assets
├── components/      # Vue components
├── composables/     # Vue composables (useAudioRecorder, etc.)
├── config/          # Configuration (languages.ts)
├── stores/          # Pinia stores
├── views/           # Main views (MainView.vue)
└── App.vue          # Root component

public/
├── app-info.json    # UI translations for all languages
└── ...              # PWA icons and assets
```

## Adding UI Translations

The app uses `public/app-info.json` for all UI translations. To add new translation strings across all languages:

### Method 1: Manual (recommended for small additions)

Edit `public/app-info.json` directly, adding your new key to the `ui` object for each language.

### Method 2: Using the translation script

1. **Edit `add-ui-translations.js`**

   Replace the `uiTranslations` object with your translations for each language:
   ```javascript
   const uiTranslations = {
     en: "Your English text",
     de: "Ihr deutscher Text",
     fr: "Votre texte français",
     // ... add all 35+ languages
   };
   ```

2. **Modify the update logic** (line ~50)

   To add a new key while preserving existing translations:
   ```javascript
   // Instead of overwriting:
   data[lang].ui = { allowMic: uiTranslations[lang] };

   // Use spread to merge:
   data[lang].ui = { ...data[lang].ui, yourNewKey: uiTranslations[lang] };
   ```

3. **Run the script**
   ```bash
   node add-ui-translations.js
   ```

### Current UI translation keys

- `allowMic` - Prompt to allow microphone access
- `micDenied` - Warning when microphone access is denied
- `noSpeechRecognition` - Warning for unsupported browsers

## Version Management

The app version is automatically read from `package.json` and injected at build time via Vite's `define` option. Update the version in `package.json` to change it throughout the app.

## API Proxy

During development, the Vite dev server includes a middleware that proxies requests to `/api/tts` to the Google Text-to-Speech API. This keeps the API key secure and avoids CORS issues.

## License

GNU GPL

## Author

Robert Wildling

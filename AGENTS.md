# Project Context: Speak & Translate Simple

## Overview
This is a speech-to-speech translation application built with Vue 3 and Vite. It allows users to record audio, transcribe it (using Voxtral), translate it, and play back the translation. It features a conversation history stored locally.

## Tech Stack
- **Framework**: Vue 3 (Composition API, `<script setup>`)
- **Build Tool**: Vite
- **Language**: TypeScript
- **State Management**: Pinia
- **Persistence**: Dexie.js (IndexedDB)
- **Styling**: Vanilla CSS (see `src/assets/main.css`, `src/style.css`)
- **Icons**: lucide-vue-next
- **Audio**: Wavesurfer.js, Web Audio API

## Key Components
- **`src/views/MainView.vue`**: The core application view orchestrating recording, visualizer, and history.
- **`src/stores/translation.ts`**: Manages state for translation, source/target languages, and history.
- **`src/composables/useAudioRecorder.ts`**: Logic for browser audio recording and permission handling.
- **`src/components/AudioPlayer.vue`**: Custom audio player component.

## Data Models
- **ConversationPair**: Stores source text, translated text, audio blob, and languages.
- **Language**: Defined in `src/config/languages.ts`.

## Development
- `npm run dev`: Start development server
- `npm run build`: Type-check and build
- `npm run preview`: Preview build

## Coding Guidelines
- **Vue**: Use Composition API with `<script setup lang="ts">`.
- **Styling**: Prefer scoped styles or utility classes defined in main CSS files.
- **Types**: Ensure strict TypeScript typing.
- **Async**: Handle audio and API operations with proper async/await and error handling.

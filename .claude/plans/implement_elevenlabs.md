# ElevenLabs TTS Integration

Add an ElevenLabs TTS button with voice selector modal, positioned between the existing Google and Browser TTS buttons.

## Proposed Changes

### API Layer

#### [NEW] [elevenlabs-tts.ts](file:///Users/robertwildling/Desktop/_WWW/_SpeakAndTranslateSimple/api/elevenlabs-tts.ts)

Create a Vercel Edge Function to proxy ElevenLabs API requests (keeping API key secure on server):

- **GET** `/api/elevenlabs-tts` → List available voices from ElevenLabs
- **POST** `/api/elevenlabs-tts` → Synthesize speech given text and voice_id
- Console log the complete response object for debugging
- Return audio as base64 or stream

---

### Composables

#### [NEW] [useElevenLabsTTS.ts](file:///Users/robertwildling/Desktop/_WWW/_SpeakAndTranslateSimple/src/composables/useElevenLabsTTS.ts)

Create a composable mirroring the [useGoogleTTS.ts](file:///Users/robertwildling/Desktop/_WWW/_SpeakAndTranslateSimple/src/composables/useGoogleTTS.ts) pattern:

```typescript
interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  labels?: { gender?: string; accent?: string };
  preview_url?: string;
}

interface UseElevenLabsTTSReturn {
  isLoading: Ref<boolean>;
  isLoadingVoices: Ref<boolean>;
  isPlaying: Ref<boolean>;
  error: Ref<string | null>;
  availableVoices: Ref<ElevenLabsVoice[]>;
  speak: (text: string, voiceId?: string) => Promise<void>;
  stop: () => void;
  fetchVoices: () => Promise<void>;
}
```

- Fetch voices from `/api/elevenlabs-tts` (GET)
- Synthesize speech via `/api/elevenlabs-tts` (POST)
- Handle audio playback with HTMLAudioElement
- Console log complete API responses

---

### Components

#### [NEW] [ElevenLabsTTSButton.vue](file:///Users/robertwildling/Desktop/_WWW/_SpeakAndTranslateSimple/src/components/ElevenLabsTTSButton.vue)

Create a component mirroring [GoogleTTSButton.vue](file:///Users/robertwildling/Desktop/_WWW/_SpeakAndTranslateSimple/src/components/GoogleTTSButton.vue):

- Props: `text: string`, `lang: string` (for filtering voices)
- Play/Stop button with distinct styling (ElevenLabs purple: `#8B5CF6`)
- Voice selector modal (Teleported to body)
- Two-column layout (Female/Male) if gender labels available
- Save selected voice per language to localStorage
- Console log complete response

---

### View Updates

#### [MODIFY] [MainView.vue](file:///Users/robertwildling/Desktop/_WWW/_SpeakAndTranslateSimple/src/views/MainView.vue)

Update TTS button layout in two places:

1. **Conversation history** (line ~457-466): Add ElevenLabsTTSButton between Google and Browser
2. **Current translation** (line ~542-551): Add ElevenLabsTTSButton between Google and Browser

New layout order:
```
Google | ElevenLabs | Browser
```

Add label "11Labs" for the middle button.

---

### Environment

#### [MODIFY] [.env.example](file:///Users/robertwildling/Desktop/_WWW/_SpeakAndTranslateSimple/.env.example)

Add `ELEVENLABS_API_KEY=your_key_here` placeholder.

---

## Verification Plan

### Manual Verification

1. **Run dev server**: `npm run dev`
2. **Test voice fetching**: Open browser console, verify voices are logged
3. **Test playback**: 
   - Create a translation
   - Click the ElevenLabs (purple) TTS button
   - Verify audio plays
   - Verify console shows complete API response
4. **Test voice selector**:
   - Click the voice settings button
   - Verify modal opens with available voices
   - Select a different voice
   - Verify it saves to localStorage
   - Verify next playback uses selected voice
5. **Test button positioning**: Verify ElevenLabs button appears between Google and Browser

### Edge Cases to Test
- Empty text (button should be disabled)
- API error (should show error state)
- No voices available for language (handle gracefully)

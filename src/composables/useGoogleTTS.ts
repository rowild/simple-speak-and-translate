import { ref } from 'vue';

export interface GoogleVoice {
  languageCodes: string[];
  name: string;
  ssmlGender: 'MALE' | 'FEMALE' | 'NEUTRAL';
  naturalSampleRateHertz: number;
}

export interface UseGoogleTTSReturn {
  isLoading: import('vue').Ref<boolean>;
  isLoadingVoices: import('vue').Ref<boolean>;
  isPlaying: import('vue').Ref<boolean>;
  error: import('vue').Ref<string | null>;
  availableVoices: import('vue').Ref<GoogleVoice[]>;
  speak: (text: string, languageCode: string, voice?: GoogleVoice | null) => Promise<void>;
  stop: () => void;
  fetchVoices: () => Promise<void>;
}

export function useGoogleTTS(): UseGoogleTTSReturn {
  const isLoading = ref(false);
  const isLoadingVoices = ref(false);
  const isPlaying = ref(false);
  const error = ref<string | null>(null);
  const audio = ref<HTMLAudioElement | null>(null);
  const availableVoices = ref<GoogleVoice[]>([]);

  /**
   * Stop current playback
   */
  const stop = () => {
    if (audio.value) {
      audio.value.pause();
      audio.value.currentTime = 0;
      audio.value = null;
    }
    isPlaying.value = false;
    isLoading.value = false;
  };

  /**
   * Convert base64 string to Blob
   */
  const base64ToBlob = (base64: string, type: string) => {
    const binStr = atob(base64);
    const len = binStr.length;
    const arr = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        arr[i] = binStr.charCodeAt(i);
    }
    return new Blob([arr], { type });
  }

  /**
   * Fetch available voices
   */
  const fetchVoices = async () => {
    isLoadingVoices.value = true;
    try {
      // Fetch from our local proxy which calls Google
      const response = await fetch('/api/tts?mode=voices'); 
      if (!response.ok) throw new Error('Failed to fetch voices');
      const data = await response.json();
      const voices = data.voices || [];
      console.log(`GoogleTTS: Fetched ${voices.length} Google Cloud voices.`);
      availableVoices.value = voices;
    } catch (e: any) {
      console.error('Error fetching Google voices:', e);
      // We don't necessarily error out the whole UI, just log it
    } finally {
      isLoadingVoices.value = false;
    }
  };

  /**
   * Request TTS audio from API and play it
   */
  const speak = async (text: string, languageCode: string, voice?: GoogleVoice | null) => {
    // 1. Reset state
    stop();
    isLoading.value = true;
    error.value = null;

    try {
      // 2. Call our Vercel API
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          text, 
          language: languageCode,
          voice: voice ? { name: voice.name, languageCode: voice.languageCodes[0] } : undefined
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || `API Error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.audioContent) {
          throw new Error('No audio received');
      }

      // 3. Create audio blob
      const audioBlob = base64ToBlob(data.audioContent, 'audio/mp3');
      const audioUrl = URL.createObjectURL(audioBlob);

      // 4. Play audio
      isLoading.value = false;
      isPlaying.value = true;

      audio.value = new Audio(audioUrl);
      
      audio.value.onended = () => {
        isPlaying.value = false;
        URL.revokeObjectURL(audioUrl); // cleanup
        audio.value = null;
      };

      audio.value.onerror = (e) => {
        console.error('Audio playback error', e);
        error.value = 'Playback failed';
        isPlaying.value = false;
        isLoading.value = false;
      };

      await audio.value.play();

    } catch (e: any) {
      console.error('Google TTS error:', e);
      error.value = e.message || 'Unknown error';
      isLoading.value = false;
      isPlaying.value = false;
    }
  };

  return {
    isLoading,
    isLoadingVoices,
    isPlaying,
    error,
    availableVoices,
    speak,
    stop,
    fetchVoices
  };
}

import { ref } from 'vue';

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  labels?: { 
    gender?: string; 
    accent?: string;
    age?: string;
    description?: string;
    use_case?: string;
  };
  preview_url?: string;
  category?: string;
}

export interface UseElevenLabsTTSReturn {
  isLoading: import('vue').Ref<boolean>;
  isLoadingVoices: import('vue').Ref<boolean>;
  isPlaying: import('vue').Ref<boolean>;
  error: import('vue').Ref<string | null>;
  availableVoices: import('vue').Ref<ElevenLabsVoice[]>;
  speak: (text: string, voiceId?: string, modelId?: string) => Promise<void>;
  stop: () => void;
  fetchVoices: () => Promise<void>;
}

export function useElevenLabsTTS(): UseElevenLabsTTSReturn {
  const isLoading = ref(false);
  const isLoadingVoices = ref(false);
  const isPlaying = ref(false);
  const error = ref<string | null>(null);
  const audio = ref<HTMLAudioElement | null>(null);
  const availableVoices = ref<ElevenLabsVoice[]>([]);

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
  };

  /**
   * Fetch available voices from ElevenLabs
   */
  const fetchVoices = async () => {
    isLoadingVoices.value = true;
    try {
      const response = await fetch('/api/elevenlabs-tts');
      if (!response.ok) throw new Error('Failed to fetch ElevenLabs voices');
      const data = await response.json();
      console.log('ElevenLabs voices complete response:', data);
      const voices = data.voices || [];
      console.log(`ElevenLabsTTS: Fetched ${voices.length} ElevenLabs voices.`);
      availableVoices.value = voices;
    } catch (e: any) {
      console.error('Error fetching ElevenLabs voices:', e);
    } finally {
      isLoadingVoices.value = false;
    }
  };

  /**
   * Request TTS audio from API and play it
   */
  const speak = async (text: string, voiceId?: string, modelId?: string) => {
    // 1. Reset state
    stop();
    isLoading.value = true;
    error.value = null;

    try {
      // 2. Call our Vercel API
      const response = await fetch('/api/elevenlabs-tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          voice_id: voiceId,
          model_id: modelId || 'eleven_multilingual_v2',
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || `API Error: ${response.status}`);
      }

      const data = await response.json();
      console.log('ElevenLabs TTS complete response:', data);

      if (!data.audioContent) {
        throw new Error('No audio received');
      }

      // 3. Create audio blob
      const audioBlob = base64ToBlob(data.audioContent, 'audio/mpeg');
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
      console.error('ElevenLabs TTS error:', e);
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
    fetchVoices,
  };
}

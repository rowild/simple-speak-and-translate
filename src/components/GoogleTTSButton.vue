<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useGoogleTTS, type GoogleVoice } from '../composables/useGoogleTTS';
import { Loader2, Square, Volume2, Settings, CircleUser, User } from 'lucide-vue-next';

const props = defineProps<{
  text: string;
  lang: string;
}>();

const { 
  isLoading, 
  isPlaying, 
  error, 
  speak, 
  stop, 
  fetchVoices, 
  availableVoices, 
  isLoadingVoices 
} = useGoogleTTS();

const showVoiceSelector = ref(false);
const selectedVoiceURI = ref<string>(''); // Using name as URI for Google voices

// Load voices when component mounts or language changes
const loadVoices = async () => {
  if (availableVoices.value.length === 0) {
    await fetchVoices();
  }
};

// Filter voices for current language
const currentLangVoices = computed(() => {
  if (!availableVoices.value) return [];
  
  // Google language codes are like "en-US", "de-DE"
  // Prop lang might be "de", "en-US", etc.
  
  // Strict match first, then loose match
  const strictMatches = availableVoices.value.filter(v => v.languageCodes.includes(props.lang));
  if (strictMatches.length > 0) return strictMatches;
  
  // Fallback to prefix match (e.g. "en" matches "en-US", "en-GB")
  const prefix = props.lang.split('-')[0];
  return availableVoices.value.filter(v => 
    v.languageCodes.some(code => code.startsWith(prefix))
  );
});

// Load saved preference
onMounted(() => {
  loadVoices();
  const saved = localStorage.getItem(`google-tts-voice-${props.lang}`);
  if (saved) {
    selectedVoiceURI.value = saved;
  }
});

watch(currentLangVoices, (voices) => {
  // If no selected voice, or selected voice not valid for this language, pick a default
  if (!selectedVoiceURI.value || !voices.find(v => v.name === selectedVoiceURI.value)) {
    // Prefer Wavenet or Neural2 if available
    const premium = voices.find(v => v.name.includes('Wavenet') || v.name.includes('Neural2'));
    if (premium) {
      selectedVoiceURI.value = premium.name;
    } else if (voices.length > 0) {
      selectedVoiceURI.value = voices[0].name;
    }
  }
});

const selectedVoice = computed(() => 
  availableVoices.value.find(v => v.name === selectedVoiceURI.value)
);

const handlePlay = () => {
  if (isPlaying.value) {
    stop();
  } else {
    if (error.value) alert(error.value);
    speak(props.text, props.lang, selectedVoice.value);
  }
};

const selectVoice = (voice: GoogleVoice) => {
  selectedVoiceURI.value = voice.name;
  localStorage.setItem(`google-tts-voice-${props.lang}`, voice.name);
  showVoiceSelector.value = false;
};

// Formatting helper
const formatVoiceName = (name: string) => {
  // Format: "fr-FR-Standard-A" -> "Standard A"
  // Or if we want just "A", "B", etc. within categories.
  // User asked for "ONLY names".
  // Let's try to extract the useful part.
  const parts = name.split('-');
  if (parts.length >= 3) {
      // e.g. ["fr", "FR", "Standard", "A"] -> "Standard A"
      return parts.slice(2).join(' ');
  }
  return name;
};

// Categorize voices by Gender (Female vs Male)
const categorizedVoices = computed(() => {
  const voices = currentLangVoices.value;
  return {
    female: voices.filter(v => v.ssmlGender === 'FEMALE'),
    male: voices.filter(v => v.ssmlGender === 'MALE'),
    // Should generally be empty for Google TTS but just in case
    other: voices.filter(v => v.ssmlGender !== 'FEMALE' && v.ssmlGender !== 'MALE'),
  };
});
</script>

<template>
  <div class="google-tts-wrapper">
    <!-- Play Button (now first for stable position) -->
    <button 
      class="google-tts-btn" 
      :class="{ 'is-playing': isPlaying, 'is-loading': isLoading }"
      @click="handlePlay"
      :disabled="isLoading || !text"
      :title="isPlaying ? 'Stop' : 'Play with Google Cloud TTS'"
    >
      <div v-if="isPlaying" class="wave-animation"></div>
      
      <span class="icon-wrapper">
        <Loader2 v-if="isLoading" class="spinner" :size="16" />
        <Square v-else-if="isPlaying" :size="16" fill="currentColor" />
        <Volume2 v-else :size="16" />
      </span>
    </button>

    <!-- Voice Selector (only if not playing and we have voices) -->
    <div v-if="!isPlaying && currentLangVoices.length > 0" class="voice-controls">
      <button
        class="voice-settings-btn"
        @click="showVoiceSelector = !showVoiceSelector"
        :title="selectedVoice ? `Google Voice: ${selectedVoice.name}` : 'Select Google voice'"
      >
        <Settings :size="14" />
      </button>
    </div>

    <!-- Voice Selector Modal (Teleported to body) -->
    <Teleport to="body">
      <div 
        v-if="showVoiceSelector" 
        class="fixed inset-0 z-9999 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        @click.self="showVoiceSelector = false"
      >
        <div class="w-full max-w-[480px] mx-4 bg-zinc-900/95 backdrop-blur-xl border border-white/20 rounded-xl p-4 shadow-2xl max-h-[80vh] overflow-y-auto">
          <div class="flex justify-between items-center mb-4 pb-3 border-b border-white/10">
            <h3 class="text-white font-semibold text-base">
              Google Cloud Voices
              <span v-if="isLoadingVoices" class="text-white/60 text-sm ml-2">(Loading...)</span>
            </h3>
            <button 
              @click="showVoiceSelector = false"
              class="text-white/60 hover:text-white transition-colors text-xl leading-none"
            >&times;</button>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <!-- Female Column -->
            <div>
              <div class="text-xs font-semibold text-white/60 uppercase mb-2 px-1 flex items-center gap-1">
                <CircleUser :size="14" class="text-pink-400" />
              </div>
              <div v-if="categorizedVoices.female.length === 0" class="text-sm text-white/40 italic px-1">None</div>
              <button
                v-for="voice in categorizedVoices.female"
                :key="voice.name"
                class="w-full text-left px-3 py-2 mb-1 rounded text-sm transition-all"
                :class="voice.name === selectedVoiceURI 
                  ? 'bg-blue-600 text-white font-semibold' 
                  : 'bg-white/5 text-white/90 hover:bg-white/15 border border-white/10'"
                @click="selectVoice(voice)"
              >
                {{ formatVoiceName(voice.name) }}
              </button>
            </div>

            <!-- Male Column -->
            <div>
              <div class="text-xs font-semibold text-white/60 uppercase mb-2 px-1 flex items-center gap-1">
                <User :size="14" class="text-blue-400" />
              </div>
              <div v-if="categorizedVoices.male.length === 0" class="text-sm text-white/40 italic px-1">None</div>
              <button
                v-for="voice in categorizedVoices.male"
                :key="voice.name"
                class="w-full text-left px-3 py-2 mb-1 rounded text-sm transition-all"
                :class="voice.name === selectedVoiceURI 
                  ? 'bg-blue-600 text-white font-semibold' 
                  : 'bg-white/5 text-white/90 hover:bg-white/15 border border-white/10'"
                @click="selectVoice(voice)"
              >
                {{ formatVoiceName(voice.name) }}
              </button>
            </div>
          </div>

          <!-- Other Column (Full width if exists) -->
          <div v-if="categorizedVoices.other.length > 0" class="mt-4 pt-4 border-t border-white/10">
            <div class="text-xs font-semibold text-white/60 uppercase mb-2 px-1">Other</div>
            <div class="grid grid-cols-2 gap-2">
              <button
                v-for="voice in categorizedVoices.other"
                :key="voice.name"
                class="w-full text-left px-3 py-2 rounded text-sm transition-all"
                :class="voice.name === selectedVoiceURI 
                  ? 'bg-blue-600 text-white font-semibold' 
                  : 'bg-white/5 text-white/90 hover:bg-white/15 border border-white/10'"
                @click="selectVoice(voice)"
              >
                {{ formatVoiceName(voice.name) }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.google-tts-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  position: relative;
}

.google-tts-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: linear-gradient(135deg, #4285f4, #34a853);
  color: white;
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.google-tts-btn:hover:not(:disabled) {
  transform: scale(1.1);
}

.google-tts-btn:active:not(:disabled) {
  transform: scale(0.95);
}

.google-tts-btn:disabled {
  opacity: 0.5;
  cursor: wait;
}

.google-tts-btn.is-playing {
  background: #ea4335; /* Red for stop */
  box-shadow: 0 4px 12px rgba(234, 67, 53, 0.3);
}

.google-tts-btn.is-playing:hover {
  box-shadow: 0 6px 16px rgba(234, 67, 53, 0.4);
}

.icon-wrapper {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
}

.play-icon {
  margin-left: 2px; /* Visual centering adjustment for play triangle */
}

/* Loading Spinner */
.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Wave Animation for playback */
.wave-animation {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.5);
  animation: ripple 1.5s infinite linear;
  z-index: 1;
}

@keyframes ripple {
  0% {
    width: 0;
    height: 0;
    opacity: 0.8;
  }
  100% {
    width: 200%;
    height: 200%;
    opacity: 0;
  }
}

/* Voice Selector Styles (Copied/Adapted from TextToSpeech.vue) */
.voice-controls {
  position: relative;
  display: flex;
  align-items: center;
}

.voice-settings-btn {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 0;
}

.voice-settings-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.4);
  transform: rotate(45deg);
}
</style>

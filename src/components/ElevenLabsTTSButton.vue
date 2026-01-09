<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useElevenLabsTTS, type ElevenLabsVoice } from '../composables/useElevenLabsTTS';
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
} = useElevenLabsTTS();

const showVoiceSelector = ref(false);
const selectedVoiceId = ref<string>('');

// ElevenLabs model options
const modelOptions = [
  { id: 'eleven_multilingual_v2', name: 'Multilingual v2', description: 'Best quality, 29 languages' },
  { id: 'eleven_turbo_v2_5', name: 'Turbo v2.5', description: 'Fast, good quality' },
  { id: 'eleven_flash_v2_5', name: 'Flash v2.5', description: 'Ultra-fast, lowest cost' },
];
const selectedModel = ref('eleven_multilingual_v2');

// Load voices when component mounts
const loadVoices = async () => {
  if (availableVoices.value.length === 0) {
    await fetchVoices();
  }
};

// Filter voices that might match the current language (if labels contain language info)
// ElevenLabs voices are mostly English but support multilingual
const currentLangVoices = computed(() => {
  if (!availableVoices.value) return [];
  
  // ElevenLabs voices don't have strict language filtering like Google
  // Return all voices - the multilingual model handles different languages
  return availableVoices.value;
});

// Load saved preference
onMounted(() => {
  loadVoices();
  const saved = localStorage.getItem(`elevenlabs-tts-voice-${props.lang}`);
  if (saved) {
    selectedVoiceId.value = saved;
  }
});

watch(currentLangVoices, (voices) => {
  // If no selected voice, or selected voice not valid, pick a default
  if (!selectedVoiceId.value || !voices.find(v => v.voice_id === selectedVoiceId.value)) {
    if (voices.length > 0) {
      selectedVoiceId.value = voices[0].voice_id;
    }
  }
});

const selectedVoice = computed(() => 
  availableVoices.value.find(v => v.voice_id === selectedVoiceId.value)
);

const handlePlay = () => {
  if (isPlaying.value) {
    stop();
  } else {
    if (error.value) alert(error.value);
    speak(props.text, selectedVoiceId.value || undefined, selectedModel.value);
  }
};

const selectVoice = (voice: ElevenLabsVoice) => {
  selectedVoiceId.value = voice.voice_id;
  localStorage.setItem(`elevenlabs-tts-voice-${props.lang}`, voice.voice_id);
  showVoiceSelector.value = false;
};

// Categorize voices by Gender
const categorizedVoices = computed(() => {
  const voices = currentLangVoices.value;
  return {
    female: voices.filter(v => v.labels?.gender?.toLowerCase() === 'female'),
    male: voices.filter(v => v.labels?.gender?.toLowerCase() === 'male'),
    other: voices.filter(v => !v.labels?.gender || 
      (v.labels?.gender?.toLowerCase() !== 'female' && v.labels?.gender?.toLowerCase() !== 'male')),
  };
});
</script>

<template>
  <div class="elevenlabs-tts-wrapper">
    <!-- Play Button -->
    <button 
      class="elevenlabs-tts-btn" 
      :class="{ 'is-playing': isPlaying, 'is-loading': isLoading }"
      @click="handlePlay"
      :disabled="isLoading || !text"
      :title="isPlaying ? 'Stop' : 'Play with ElevenLabs TTS'"
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
        :title="selectedVoice ? `ElevenLabs Voice: ${selectedVoice.name}` : 'Select ElevenLabs voice'"
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
        <div class="w-full max-w-120 mx-4 bg-zinc-900/95 backdrop-blur-xl border border-white/20 rounded-xl p-4 shadow-2xl max-h-[80vh] overflow-y-auto">
          <div class="flex justify-between items-center mb-4 pb-3 border-b border-white/10">
            <h3 class="text-white font-semibold text-base">
              ElevenLabs Voices
              <span v-if="isLoadingVoices" class="text-white/60 text-sm ml-2">(Loading...)</span>
            </h3>
            <button 
              @click="showVoiceSelector = false"
              class="text-white/60 hover:text-white transition-colors text-xl leading-none"
            >&times;</button>
          </div>

          <!-- Model Selector -->
          <div class="mb-4">
            <div class="text-xs font-semibold text-white/60 uppercase mb-2 px-1">Model</div>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="model in modelOptions"
                :key="model.id"
                class="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                :class="model.id === selectedModel 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-white/10 text-white/70 hover:bg-white/20'"
                @click="selectedModel = model.id"
                :title="model.description"
              >
                {{ model.name }}
              </button>
            </div>
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
                :key="voice.voice_id"
                class="w-full text-left px-3 py-2 mb-1 rounded text-sm transition-all"
                :class="voice.voice_id === selectedVoiceId 
                  ? 'bg-purple-600 text-white font-semibold' 
                  : 'bg-white/5 text-white/90 hover:bg-white/15 border border-white/10'"
                @click="selectVoice(voice)"
              >
                {{ voice.name }}
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
                :key="voice.voice_id"
                class="w-full text-left px-3 py-2 mb-1 rounded text-sm transition-all"
                :class="voice.voice_id === selectedVoiceId 
                  ? 'bg-purple-600 text-white font-semibold' 
                  : 'bg-white/5 text-white/90 hover:bg-white/15 border border-white/10'"
                @click="selectVoice(voice)"
              >
                {{ voice.name }}
              </button>
            </div>
          </div>

          <!-- Other Column (Full width if exists) -->
          <div v-if="categorizedVoices.other.length > 0" class="mt-4 pt-4 border-t border-white/10">
            <div class="text-xs font-semibold text-white/60 uppercase mb-2 px-1">Other</div>
            <div class="grid grid-cols-2 gap-2">
              <button
                v-for="voice in categorizedVoices.other"
                :key="voice.voice_id"
                class="w-full text-left px-3 py-2 rounded text-sm transition-all"
                :class="voice.voice_id === selectedVoiceId 
                  ? 'bg-purple-600 text-white font-semibold' 
                  : 'bg-white/5 text-white/90 hover:bg-white/15 border border-white/10'"
                @click="selectVoice(voice)"
              >
                {{ voice.name }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.elevenlabs-tts-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  position: relative;
}

.elevenlabs-tts-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: linear-gradient(135deg, #8B5CF6, #6366F1);
  color: white;
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.elevenlabs-tts-btn:hover:not(:disabled) {
  transform: scale(1.1);
}

.elevenlabs-tts-btn:active:not(:disabled) {
  transform: scale(0.95);
}

.elevenlabs-tts-btn:disabled {
  opacity: 0.5;
  cursor: wait;
}

.elevenlabs-tts-btn.is-playing {
  background: #ea4335; /* Red for stop */
  box-shadow: 0 4px 12px rgba(234, 67, 53, 0.3);
}

.elevenlabs-tts-btn.is-playing:hover {
  box-shadow: 0 6px 16px rgba(234, 67, 53, 0.4);
}

.icon-wrapper {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
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

/* Voice Selector Styles */
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

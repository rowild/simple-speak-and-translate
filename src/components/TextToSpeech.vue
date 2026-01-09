<script setup lang="ts">
import { ref, watch, onUnmounted, onMounted, computed } from 'vue';
import { Volume2, Square, Settings, CircleUser, User } from 'lucide-vue-next';

const props = defineProps<{
  text: string;
  lang: string;
}>();

const isSpeaking = ref(false);
const showVoiceSelector = ref(false);
const availableVoices = ref<SpeechSynthesisVoice[]>([]);
const selectedVoiceURI = ref<string>('');

// Load available voices for the current language
const loadVoices = () => {
  const voices = speechSynthesis.getVoices();
  console.log('All voices:', voices.length);
  // Filter voices for current language (match by language code prefix)
  const langPrefix = props.lang.split('-')[0];
  availableVoices.value = voices.filter(voice =>
    voice.lang.toLowerCase().startsWith(langPrefix.toLowerCase())
  );
  console.log(`Voices for ${props.lang}:`, availableVoices.value.length, availableVoices.value.map(v => v.name));

  // Load saved voice preference from localStorage
  const savedVoiceURI = localStorage.getItem(`tts-voice-${props.lang}`);
  if (savedVoiceURI && availableVoices.value.some(v => v.voiceURI === savedVoiceURI)) {
    selectedVoiceURI.value = savedVoiceURI;
  } else if (availableVoices.value.length > 0) {
    // Default to first available voice
    selectedVoiceURI.value = availableVoices.value[0].voiceURI;
  }
  console.log('Selected voice URI:', selectedVoiceURI.value);
};

// Categorize voices by gender (heuristic based on name)
interface CategorizedVoice {
  voice: SpeechSynthesisVoice;
  category: 'male' | 'female' | 'other';
}

const categorizedVoices = computed<CategorizedVoice[]>(() => {
  return availableVoices.value.map(voice => {
    const nameLower = voice.name.toLowerCase();
    let category: 'male' | 'female' | 'other' = 'other';

    // Common female indicators
    const femalePatterns = [
      'female', 'woman', 'girl', 'grandma', 'mom', 'mother',
      // English names
      'samantha', 'victoria', 'karen', 'moira', 'kate', 'sara', 'alice', 'susan', 'allison', 'fiona', 'vicki',
      // French names
      'amélie', 'amelie', 'marie', 'juliette', 'céline', 'celine', 'pauline', 'catherine', 'sophie',
      // German names
      'anna', 'petra', 'gisela', 'marlene', 'steffi', 'anja',
      // Spanish/Italian names
      'lucia', 'monica', 'carmen', 'isabella', 'valentina', 'giulia',
      // Common generic female names
      'shelley', 'sandy', 'flo', 'lucy', 'emma', 'olivia', 'ava', 'mia'
    ];

    // Common male indicators
    const malePatterns = [
      'male', 'man', 'boy', 'grandpa', 'dad', 'father',
      // English names
      'daniel', 'thomas', 'alex', 'gordon', 'tom', 'fred', 'james', 'john', 'david', 'paul', 'mark',
      // French names
      'jacques', 'pierre', 'henri', 'antoine', 'nicolas', 'eddy', 'reed',
      // German names
      'hans', 'klaus', 'martin', 'stefan', 'markus', 'yannick',
      // Spanish/Italian names
      'jorge', 'diego', 'carlos', 'diego', 'marco', 'paolo',
      // Common generic male names
      'rocko', 'rocky'
    ];

    // Check for female patterns
    if (femalePatterns.some(pattern => nameLower.includes(pattern))) {
      category = 'female';
    }
    // Check for male patterns
    else if (malePatterns.some(pattern => nameLower.includes(pattern))) {
      category = 'male';
    }

    return { voice, category };
  });
});

const selectedVoice = computed(() =>
  availableVoices.value.find(v => v.voiceURI === selectedVoiceURI.value)
);

const selectVoice = (voiceURI: string) => {
  selectedVoiceURI.value = voiceURI;
  localStorage.setItem(`tts-voice-${props.lang}`, voiceURI);
  showVoiceSelector.value = false;
};

const toggleSpeech = () => {
  if (isSpeaking.value) {
    // Stop speaking
    speechSynthesis.cancel();
    isSpeaking.value = false;
  } else {
    // Start speaking
    const utterance = new SpeechSynthesisUtterance(props.text);
    utterance.lang = props.lang;

    // Use selected voice if available
    if (selectedVoice.value) {
      utterance.voice = selectedVoice.value;
    }

    utterance.onstart = () => {
      isSpeaking.value = true;
    };

    utterance.onend = () => {
      isSpeaking.value = false;
    };

    utterance.onerror = () => {
      isSpeaking.value = false;
    };

    speechSynthesis.speak(utterance);
  }
};

// Watch for language changes to reload voices
watch(() => props.lang, () => {
  loadVoices();
});

onMounted(() => {
  // Load voices on mount
  loadVoices();

  // Some browsers need this event to load voices
  if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = loadVoices;
  }
});

onUnmounted(() => {
  speechSynthesis.cancel();

  // Clean up event listener
  if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = null;
  }
});
</script>

<template>
  <div class="tts-wrapper">

    <!-- Voice Selector (shown when not speaking) -->
    <div v-if="!isSpeaking && availableVoices.length > 0" class="voice-controls">
      <button
        class="voice-settings-btn"
        @click="showVoiceSelector = !showVoiceSelector"
        :title="selectedVoice ? `Voice: ${selectedVoice.name}` : 'Select voice'"
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
            <h3 class="text-white font-semibold text-base">Select Browser Voice</h3>
            <button 
              @click="showVoiceSelector = false"
              class="text-white/60 hover:text-white transition-colors text-xl leading-none"
            >&times;</button>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <!-- Female voices (left column) -->
            <div v-if="categorizedVoices.filter(v => v.category === 'female').length > 0">
              <div class="text-xs font-semibold text-white/60 uppercase mb-2 px-1 flex items-center gap-1">
                <CircleUser :size="14" class="text-pink-400" />
              </div>
              <button
                v-for="{ voice } in categorizedVoices.filter(v => v.category === 'female')"
                :key="voice.voiceURI"
                class="w-full text-left px-3 py-2 mb-1 rounded text-sm transition-all"
                :class="voice.voiceURI === selectedVoiceURI 
                  ? 'bg-pink-600 text-white font-semibold' 
                  : 'bg-white/5 text-white/90 hover:bg-white/15 border border-white/10'"
                @click="selectVoice(voice.voiceURI)"
              >
                {{ voice.name }}
              </button>
            </div>

            <!-- Male voices (right column) -->
            <div v-if="categorizedVoices.filter(v => v.category === 'male').length > 0">
              <div class="text-xs font-semibold text-white/60 uppercase mb-2 px-1 flex items-center gap-1">
                <User :size="14" class="text-blue-400" />
              </div>
              <button
                v-for="{ voice } in categorizedVoices.filter(v => v.category === 'male')"
                :key="voice.voiceURI"
                class="w-full text-left px-3 py-2 mb-1 rounded text-sm transition-all"
                :class="voice.voiceURI === selectedVoiceURI 
                  ? 'bg-pink-600 text-white font-semibold' 
                  : 'bg-white/5 text-white/90 hover:bg-white/15 border border-white/10'"
                @click="selectVoice(voice.voiceURI)"
              >
                {{ voice.name }}
              </button>
            </div>
          </div>

          <!-- Other voices (full width at bottom) -->
          <div v-if="categorizedVoices.filter(v => v.category === 'other').length > 0" class="mt-4 pt-4 border-t border-white/10">
            <div class="text-xs font-semibold text-white/60 uppercase mb-2 px-1">Other</div>
            <div class="grid grid-cols-2 gap-2">
              <button
                v-for="{ voice } in categorizedVoices.filter(v => v.category === 'other')"
                :key="voice.voiceURI"
                class="w-full text-left px-3 py-2 rounded text-sm transition-all"
                :class="voice.voiceURI === selectedVoiceURI 
                  ? 'bg-pink-600 text-white font-semibold' 
                  : 'bg-white/5 text-white/90 hover:bg-white/15 border border-white/10'"
                @click="selectVoice(voice.voiceURI)"
              >
                {{ voice.name }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Play/Stop button -->
    <button
      class="tts-button"
      :class="{ speaking: isSpeaking }"
      @click="toggleSpeech"
      :title="isSpeaking ? 'Stop playback' : 'Play translation'"
      :disabled="!text"
    >
      <div v-if="isSpeaking" class="wave-animation"></div>
      <span class="icon-wrapper">
        <Square v-if="isSpeaking" :size="16" fill="currentColor" />
        <Volume2 v-else :size="16" />
      </span>
    </button>
  </div>
</template>

<style scoped>
.tts-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  position: relative;
}

.tts-button {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: linear-gradient(135deg, #e91e63, #9c27b0);
  color: white;
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tts-button:hover:not(:disabled) {
  transform: scale(1.1);
}

.tts-button:active:not(:disabled) {
  transform: scale(0.95);
}

.tts-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tts-button.speaking {
  background: #ea4335;
  box-shadow: 0 4px 12px rgba(234, 67, 53, 0.3);
}

.tts-button.speaking:hover {
  box-shadow: 0 6px 16px rgba(234, 67, 53, 0.4);
}

.icon-wrapper {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
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

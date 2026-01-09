<script setup lang="ts">
import { onMounted, ref, computed, watch, nextTick } from 'vue';
import { useTranslationStore } from '../stores/translation';
import { useAudioRecorder } from '../composables/useAudioRecorder';
import { useAppUpdate } from '../composables/useAppUpdate';
import Background from '../components/Background.vue'
import LanguageWheelPicker from '../components/LanguageWheelPicker.vue';
import InfoModal from '../components/InfoModal.vue';
import AudioPlayer from '../components/AudioPlayer.vue';
import RecordingVisualizer from '../components/RecordingVisualizer.vue';
import TextToSpeech from '../components/TextToSpeech.vue';
import GoogleTTSButton from '../components/GoogleTTSButton.vue';
import ElevenLabsTTSButton from '../components/ElevenLabsTTSButton.vue';
import { languages, type Language } from '../config/languages';
import { Trash2, Plus, Mic, Square, Info, X, Download } from 'lucide-vue-next';

const store = useTranslationStore();

// App version from vite.config.ts define
const appVersion = __APP_VERSION__;
const {
  isRecording,
  startRecording,
  stopRecording,
  permissionStatus,
  checkPermission,
  transcript,
  isSpeechRecognitionSupported,
  analyserNode,
  setTranscript
} = useAudioRecorder();

const { updateAvailable, applyUpdate } = useAppUpdate();

const isOffline = ref(!navigator.onLine);
const recordedBlob = ref<Blob | null>(null);
const inputLanguage = ref<Language | null>(null);
const outputLanguage = ref<Language | null>(null);
const sourceLang = ref<Language | null>(null);
const isTranslated = ref(false); // Track if current recording has been translated
const currentTranslationOutputLang = ref<Language | null>(null); // Locked output language for current translation

// Language picker state
const showLanguagePicker = ref(false);
const isFirstRun = ref(false);
const hasCompletedSetup = ref(false);

// Info modal state
const showInfoModal = ref(false);

// Delete all confirmation modal state
const showDeleteAllModal = ref(false);

// Conversation history
interface ConversationPair {
  sourceText: string;
  translatedText: string;
  audioBlob: Blob;
  inputLang: Language;
  outputLang: Language;
}

const conversationHistory = ref<ConversationPair[]>([]);

// Load app-info.json for UI translations
interface AppInfoData {
  overview: { header: string; content: string };
  howToUse: { header: string; content: string };
  dataNote: { header: string; content: string };
  ui: {
    allowMic: string;
    micDenied: string;
    noSpeechRecognition: string;
    deleteAllConfirm?: string;
    deleteAllNo?: string;
    deleteAllYes?: string;
    updateAvailable?: string;
    updateNow?: string;
  };
}

const appInfoData = ref<Record<string, AppInfoData>>({});

// Computed property for UI translations based on source language
const uiText = computed(() => {
  const langCode = sourceLang.value?.displayCode || 'en';
  const data = appInfoData.value[langCode] || appInfoData.value['en'];
  return data?.ui || {
    allowMic: 'Please allow microphone access when prompted.',
    micDenied: 'Microphone access is denied. Please enable it in your browser settings.',
    noSpeechRecognition: 'Real-time transcription is not supported in this browser. Audio will still be recorded.',
    deleteAllConfirm: 'Are you sure you want to delete ALL translations and transcriptions?',
    deleteAllNo: 'No',
    deleteAllYes: 'Yes',
    updateAvailable: 'A new version is available',
    updateNow: 'Update Now'
  };
});

window.addEventListener('online', () => isOffline.value = false);
window.addEventListener('offline', () => isOffline.value = true);

// Load saved language preferences from localStorage
onMounted(async () => {
  // Load app-info.json for UI translations
  try {
    const response = await fetch('/app-info.json');
    appInfoData.value = await response.json();
  } catch (error) {
    console.error('Failed to load app-info.json:', error);
  }

  // Always initialize app
  hasCompletedSetup.value = true;
  store.loadHistory();
  checkPermission();

  // Load saved source language or set German as default
  const savedSourceCode = localStorage.getItem('sourceLang');
  if (savedSourceCode) {
    sourceLang.value = languages.find(lang => lang.displayCode === savedSourceCode) || null;
  } else {
    // Set German as default source
    const defaultSource = languages.find(lang => lang.code === 'de-DE');
    if (defaultSource) {
      sourceLang.value = defaultSource;
      localStorage.setItem('sourceLang', defaultSource.displayCode);
      store.setSourceLang(defaultSource.displayCode);
    }
  }

  // Load saved output language or set French as default
  const savedOutputCode = localStorage.getItem('targetLang');
  if (savedOutputCode) {
    outputLanguage.value = languages.find(lang => lang.displayCode === savedOutputCode) || null;
    if (outputLanguage.value) {
      store.setTargetLang(outputLanguage.value.displayCode);
    }
  } else {
    // Set French as default target
    const defaultTarget = languages.find(lang => lang.code === 'fr-FR');
    if (defaultTarget) {
      outputLanguage.value = defaultTarget;
      store.setTargetLang(defaultTarget.displayCode);
    }
  }
});

// Watch output language changes and sync with store and localStorage
watch(outputLanguage, (newLang) => {
  if (newLang) {
    // This will also save to localStorage as 'targetLang'
    store.setTargetLang(newLang.displayCode);
  }
});

// Ref for main container to control scrolling
const mainContainerRef = ref<HTMLElement | null>(null);
const currentPairRef = ref<HTMLElement | null>(null);
const recordingVisualizerRef = ref<HTMLElement | null>(null);

// Function to scroll newest content into view (at the bottom)
const scrollToLatest = () => {
  const forceScroll = () => {
    // Try scrollIntoView on the recording visualizer (when recording)
    if (recordingVisualizerRef.value) {
      recordingVisualizerRef.value.scrollIntoView({ behavior: 'smooth', block: 'end' });
      return;
    }

    // Try scrollIntoView on the current pair element
    if (currentPairRef.value) {
      currentPairRef.value.scrollIntoView({ behavior: 'smooth', block: 'end' });
      return;
    }

    // Fallback to manual scroll to bottom
    if (mainContainerRef.value) {
      const container = mainContainerRef.value;
      const maxScroll = container.scrollHeight - container.clientHeight;

      container.scrollTo({
        top: maxScroll,
        behavior: 'smooth'
      });

      setTimeout(() => {
        container.scrollTop = maxScroll;
      }, 50);
    }
  };

  // Force scroll after DOM updates
  nextTick(() => {
    setTimeout(forceScroll, 300);
  });
};

// Auto-scroll to latest when recording starts
watch(isRecording, (recording) => {
  if (recording) {
    scrollToLatest();
  }
});

// Auto-scroll to latest when translation completes
watch(isTranslated, (translated) => {
  if (translated) {
    scrollToLatest();
  }
});

// Auto-scroll to latest when conversation history changes (new translation added)
watch(() => conversationHistory.value.length, () => {
  scrollToLatest();
});

// Also scroll when recordedBlob changes (new recording available)
watch(recordedBlob, (blob) => {
  if (blob) {
    scrollToLatest();
  }
});

// Record button is only enabled when output language is selected (input is auto-detected)
const canRecord = computed(() => {
  return !!outputLanguage.value;
});

// Handle language picker confirmation
const handleLanguageConfirm = (payload: { source: Language | null; target: Language }) => {
  // Both languages are now required
  if (!payload.source || !payload.target) {
    console.error('Both source and target languages are required');
    return;
  }

  sourceLang.value = payload.source;
  outputLanguage.value = payload.target;

  // Update store
  store.setSourceLang(payload.source.displayCode);
  store.setTargetLang(payload.target.displayCode);

  if (isFirstRun.value) {
    // Mark as completed
    localStorage.setItem('hasCompletedLanguageSetup', 'true');
    isFirstRun.value = false;
    hasCompletedSetup.value = true;

    // Now initialize app
    store.loadHistory();
    checkPermission();
  }

  showLanguagePicker.value = false;
};

const handleRecordToggle = async () => {
  if (isRecording.value) {
    try {
      // console.log('Stopping recording...');
      const blob = await stopRecording();
      // console.log('Recording stopped. Blob received:', blob);

      if (blob.size === 0) {
        // console.error('Blob is empty!');
        return;
      }

      recordedBlob.value = blob;

      // Show processing status
      setTranscript('Processing with Voxtral...');

      // Send to Voxtral for combined transcription and translation
      await store.transcribeAndTranslate(blob);

      // Update transcript from store
      setTranscript(store.currentSourceText);

      // Mark as translated since we got both in one call
      isTranslated.value = true;

      // Use the actual translated language from the store (might be fallback)
      currentTranslationOutputLang.value = store.actualTranslatedLanguage ? { ...store.actualTranslatedLanguage } : null;

      // console.log('After transcription & translation:');
      // console.log('- Source text:', store.currentSourceText);
      // console.log('- Detected language:', store.detectedLanguage);
      // console.log('- Translated text:', store.currentTranslatedText);
      // console.log('- Locked output language:', currentTranslationOutputLang.value?.nativeName);

    } catch (e) {
      console.error('Error during processing:', e);
      setTranscript('Error: Could not process audio');
      isTranslated.value = false;
    }
  } else {
    try {
      // console.log('Starting recording...');
      recordedBlob.value = null;
      setTranscript('');
      isTranslated.value = false;
      currentTranslationOutputLang.value = null; // Reset locked language

      await startRecording();
    } catch (e) {
      console.error('Start recording failed:', e);
      alert('Could not access microphone');
    }
  }
};

const handleDeleteRecording = () => {
  // console.log('Deleting current recording...');
  recordedBlob.value = null;
  setTranscript('');
  isTranslated.value = false;
  currentTranslationOutputLang.value = null; // Reset locked language
  store.currentTranslatedText = '';
  store.detectedLanguage = null;
};

const handleCancelRecording = async () => {
  // Stop recording without saving
  if (isRecording.value) {
    try {
      await stopRecording();
    } catch (e) {
      console.error('Error stopping recording:', e);
    }
  }
  // Reset everything
  recordedBlob.value = null;
  setTranscript('');
  isTranslated.value = false;
  currentTranslationOutputLang.value = null;
  store.currentTranslatedText = '';
  store.detectedLanguage = null;
};


const handleNewRecording = async () => {
  // console.log('Starting new recording...');

  // Save current conversation pair to history
  if (recordedBlob.value && store.detectedLanguage && currentTranslationOutputLang.value) {
    // Use detected language from Voxtral
    const actualInputLang = store.detectedLanguage;

    // Use the locked output language (already a copy, no need to spread again)
    conversationHistory.value.push({
      sourceText: transcript.value,
      translatedText: store.currentTranslatedText,
      audioBlob: recordedBlob.value,
      inputLang: { ...actualInputLang },
      outputLang: currentTranslationOutputLang.value,
    });
    console.log('Saved to history. Total pairs:', conversationHistory.value.length);
  }

  // Reset for new recording
  recordedBlob.value = null;
  currentTranslationOutputLang.value = null; // Reset locked language
  setTranscript('');
  isTranslated.value = false;
  store.currentTranslatedText = '';
  store.detectedLanguage = null;

  // Ensure target language is set correctly from the output language selection
  if (outputLanguage.value) {
    store.setTargetLang(outputLanguage.value.displayCode);
    // console.log('Target language confirmed:', outputLanguage.value.nativeName, outputLanguage.value.displayCode);
  } else {
    console.warn('No output language selected!');
  }

  // Automatically start recording (button will appear as red/active)
  try {
    await startRecording();
    // console.log('Auto-started new recording');
  } catch (error) {
    console.error('Failed to auto-start recording:', error);
  }
};

const handleDeleteAll = () => {
  // Clear conversation history
  conversationHistory.value = [];
  
  // Clear current recording state
  recordedBlob.value = null;
  setTranscript('');
  isTranslated.value = false;
  currentTranslationOutputLang.value = null;
  store.currentTranslatedText = '';
  store.detectedLanguage = null;
  
  // Close modal
  showDeleteAllModal.value = false;
};
</script>

<template>
  <div class="main-view" :class="{ 'modal-open': showLanguagePicker || showInfoModal }">
    <!-- Header (Always Visible) -->
    <header>
      <h1>
        <span>Speak</span>
        <span>&</span>
        <span>Translate</span>
        <span class="version-badge">v{{ appVersion }}</span>
      </h1>
      <div v-if="isOffline" class="offline-badge">Offline</div>
    </header>

    <!-- Center Content -->
    <div class="center-content">
      <!-- Main Content Area -->
      <main v-if="hasCompletedSetup" ref="mainContainerRef">
        <!-- Permission Warnings -->
        <div v-if="permissionStatus === 'denied'" class="warning-box">
          <p>{{ uiText.micDenied }}</p>
        </div>
        <div v-else-if="permissionStatus === 'prompt'" class="warning-box">
          <p>{{ uiText.allowMic }}</p>
        </div>

        <!-- Speech Recognition Warning -->
        <div v-if="!isSpeechRecognitionSupported" class="warning-box">
          <p>{{ uiText.noSpeechRecognition }}</p>
        </div>

        <!-- Conversation History -->
        <div v-if="conversationHistory.length > 0" class="conversation-history">
          <div v-for="(pair, index) in conversationHistory" :key="index" class="conversation-pair history-pair">
            <!-- Input (Source) -->
            <div class="input-output-row">
              <div class="language-indicator">
                <span class="lang-flag">{{ pair.inputLang.flag }}</span>
                <span class="lang-name">{{ pair.inputLang.nativeName }}</span>
              </div>
              <div class="transcript-field input-field">
                <div class="transcript-content" :dir="pair.inputLang.isRTL ? 'rtl' : 'ltr'">{{ pair.sourceText }}</div>
                <AudioPlayer :audio-blob="pair.audioBlob" />
              </div>
            </div>

            <!-- Output (Translation) -->
            <div class="input-output-row output-row">
              <div class="language-indicator">
                <span class="lang-flag">{{ pair.outputLang.flag }}</span>
                <span class="lang-name">{{ pair.outputLang.nativeName }}</span>
              </div>
              <div class="transcript-field output-field">
                <div class="transcript-content" :dir="pair.outputLang.isRTL ? 'rtl' : 'ltr'">{{ pair.translatedText }}</div>
                <div class="tts-actions">
                  <div class="tts-label">
                    <div class="tts-option">Google</div>
                    <GoogleTTSButton :text="pair.translatedText" :lang="pair.outputLang.code" />
                  </div>
                  <div class="tts-label">
                    <div class="tts-option">11Labs</div>
                    <ElevenLabsTTSButton :text="pair.translatedText" :lang="pair.outputLang.code" />
                  </div>
                  <div class="tts-label right">
                    <div class="tts-option">Browser</div>
                    <TextToSpeech :text="pair.translatedText" :lang="pair.outputLang.speechCode" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Recording Visualizer with inline record button (show while recording OR ready to record and no result) -->
        <div v-if="(isRecording || (canRecord && !recordedBlob)) && !store.isProcessing" class="conversation-pair" ref="recordingVisualizerRef">
          <div class="input-output-row">
            <div class="language-indicator" v-if="inputLanguage">
              <span class="lang-flag">{{ inputLanguage.flag }}</span>
              <span class="lang-name">{{ inputLanguage.nativeName }}</span>
            </div>
            <div class="visualizer-with-button">
              <div class="visualizer-container">
                <RecordingVisualizer :is-recording="isRecording" :analyser="analyserNode" />
              </div>
              <div class="record-btn-container">
                <button
                  class="inline-record-btn"
                  :class="{ recording: isRecording }"
                  @click="handleRecordToggle"
                  :disabled="isOffline || permissionStatus === 'denied'"
                  :title="isRecording ? 'Stop recording' : 'Start recording'"
                >
                  <Square v-if="isRecording" :size="24" />
                  <Mic v-else :size="24" />
                </button>
                <button
                  v-if="isRecording"
                  class="cancel-record-btn"
                  @click="handleCancelRecording"
                  title="Cancel recording"
                >
                  <X :size="24" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Current Input/Output Pair (only show AFTER recording has stopped) -->
        <div v-if="canRecord && recordedBlob" class="conversation-pair" ref="currentPairRef">
          <!-- Input (Source) Section -->
          <div class="input-output-row">
            <div class="language-indicator" v-if="store.detectedLanguage || inputLanguage">
              <span class="lang-flag">{{ (store.detectedLanguage || inputLanguage)?.flag }}</span>
              <span class="lang-name">{{ (store.detectedLanguage || inputLanguage)?.nativeName }}</span>
            </div>
            <div class="field-with-actions">
              <div class="transcript-field input-field">
                <div class="transcript-content" :class="{ placeholder: !transcript && !store.isProcessing }" :dir="(store.detectedLanguage || inputLanguage)?.isRTL ? 'rtl' : 'ltr'">
                  {{ transcript || (store.isProcessing ? 'Processing...' : 'Transcription will appear here...') }}
                </div>
                <AudioPlayer :audio-blob="recordedBlob" />
              </div>

              <!-- Action buttons -->
              <div class="action-buttons">
                <button class="delete-btn" @click="handleDeleteRecording" title="Delete recording and start over">
                  <Trash2 :size="20" />
                </button>
              </div>
            </div>
          </div>

          <!-- Output (Translation) Section (only show AFTER translation) -->
          <div v-if="isTranslated" class="input-output-row output-row">
            <div class="language-indicator" v-if="currentTranslationOutputLang">
              <span class="lang-flag">{{ currentTranslationOutputLang.flag }}</span>
              <span class="lang-name">{{ currentTranslationOutputLang.nativeName }}</span>
            </div>
            <div class="transcript-field output-field">
              <div class="transcript-content" :dir="currentTranslationOutputLang?.isRTL ? 'rtl' : 'ltr'">
                {{ store.currentTranslatedText || 'Translation...' }}
              </div>
              <div class="tts-actions">
                <div class="tts-label">
                  <div class="tts-option">Google</div>
                  <GoogleTTSButton v-if="currentTranslationOutputLang" :text="store.currentTranslatedText" :lang="currentTranslationOutputLang.code" />
                </div>
                <div class="tts-label">
                  <div class="tts-option">11Labs</div>
                  <ElevenLabsTTSButton v-if="currentTranslationOutputLang" :text="store.currentTranslatedText" :lang="currentTranslationOutputLang.code" />
                </div>
                <div class="tts-label right">
                  <div class="tts-option">Browser</div>
                  <TextToSpeech v-if="currentTranslationOutputLang" :text="store.currentTranslatedText" :lang="currentTranslationOutputLang.speechCode" />
                </div>
              </div>
            </div>
          </div>

          <!-- Action buttons: Delete All and New Recording (only show AFTER translation) -->
          <div v-if="isTranslated" class="new-recording-section">
            <button class="delete-all-btn" @click="showDeleteAllModal = true" :title="uiText.deleteAllConfirm">
              <Trash2 :size="24" />
            </button>
            <button class="plus-btn" @click="handleNewRecording" title="Start new recording">
              <Plus :size="32" />
            </button>
          </div>
        </div>

      </main>
    </div>

    <!-- Language Picker Modal -->
    <LanguageWheelPicker
      :is-open="showLanguagePicker"
      :is-first-run="isFirstRun"
      :initial-source="sourceLang || undefined"
      :initial-target="outputLanguage || undefined"
      @confirm="handleLanguageConfirm"
      @close="showLanguagePicker = false"
    />

    <!-- Info Modal -->
    <InfoModal
      :is-open="showInfoModal"
      :source-lang="sourceLang"
      :target-lang="outputLanguage"
      @close="showInfoModal = false"
    />

    <!-- Delete All Confirmation Modal -->
    <Teleport to="body">
      <div
        v-if="showDeleteAllModal"
        class="fixed inset-0 z-9999 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        @click.self="showDeleteAllModal = false"
      >
        <div class="w-full max-w-90 mx-4 bg-zinc-900/95 backdrop-blur-xl border border-white/20 rounded-xl p-5 shadow-2xl">
          <p class="text-white text-center mb-6 text-base leading-relaxed">
            {{ uiText.deleteAllConfirm }}
          </p>
          <div class="flex gap-3 justify-center">
            <button
              @click="showDeleteAllModal = false"
              class="px-6 py-2 rounded-lg bg-white/10 text-white/90 hover:bg-white/20 transition-colors border border-white/20 font-medium"
            >
              {{ uiText.deleteAllNo }}
            </button>
            <button
              @click="handleDeleteAll"
              class="px-6 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors font-medium"
            >
              {{ uiText.deleteAllYes }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Update Available Banner -->
    <Teleport to="body">
      <Transition name="slide-up">
        <div
          v-if="updateAvailable"
          class="fixed bottom-20 left-0 right-0 z-1000 flex justify-center px-4"
        >
          <div class="w-full max-w-md bg-zinc-900/95 backdrop-blur-xl border border-white/20 rounded-xl px-4 py-3 shadow-2xl flex items-center gap-3">
            <Download :size="20" class="text-emerald-400 shrink-0" />
            <p class="text-white text-sm flex-1">
              {{ uiText.updateAvailable }}
            </p>
            <button
              @click="applyUpdate"
              class="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700 transition-colors font-medium whitespace-nowrap"
            >
              {{ uiText.updateNow }}
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Fixed Footer with Controls (Always Visible) -->
    <footer class="app-footer">
      <!-- Info Button (only show after setup) -->
      <button
        v-if="hasCompletedSetup"
        class="footer-info-btn"
        @click="showInfoModal = true"
        title="App information and help"
      >
        <Info :size="20" />
        <span class="info-label">Info</span>
      </button>

      <!-- Dual Language Button (only show after setup) -->
      <button
        v-if="hasCompletedSetup"
        class="footer-lang-btn dual-lang-btn"
        @click="showLanguagePicker = true"
        :title="`Change languages: ${sourceLang?.nativeName || 'Select'} → ${outputLanguage?.nativeName || 'Select'}`"
      >
        <span class="footer-flag source-flag">{{ sourceLang?.flag || '❓' }}</span>
        <span class="footer-arrow">→</span>
        <span class="footer-flag target-flag">{{ outputLanguage?.flag || '❓' }}</span>
      </button>
    </footer>

    <Background/>
  </div>
</template>

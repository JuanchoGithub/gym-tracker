let voices: SpeechSynthesisVoice[] = [];
let voicesPromise: Promise<SpeechSynthesisVoice[]> | null = null;
const utteranceRef: SpeechSynthesisUtterance[] = []; // Keep reference to utterances

const populateAndResolve = (resolve: (value: SpeechSynthesisVoice[]) => void) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        voices = window.speechSynthesis.getVoices();
        if (voices.length) {
            resolve(voices);
        }
    }
};

const getVoicesPromise = (): Promise<SpeechSynthesisVoice[]> => {
    if (voicesPromise) {
        return voicesPromise;
    }

    voicesPromise = new Promise((resolve) => {
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
            return resolve([]);
        }
        
        // Initial attempt
        populateAndResolve(resolve);

        // If not populated, wait for the event or a timeout
        if (!voices.length) {
            window.speechSynthesis.onvoiceschanged = () => populateAndResolve(resolve);
            // Fallback timeout in case onvoiceschanged doesn't fire
            setTimeout(() => populateAndResolve(resolve), 250);
        }
    });

    return voicesPromise;
};

export const getAvailableVoices = async (lang: string): Promise<SpeechSynthesisVoice[]> => {
  const allVoices = await getVoicesPromise();
  return allVoices.filter(voice => voice.lang.startsWith(lang));
};

export const speak = async (text: string, voiceURI?: string | null, lang?: string) => {
  if (!('speechSynthesis' in window)) {
    console.warn('Speech synthesis not supported.');
    return;
  }
  
  // Cancel any ongoing speech to prevent overlap
  window.speechSynthesis.cancel();
  
  const allVoices = await getVoicesPromise();
  const utterance = new SpeechSynthesisUtterance(text);
  
  utterance.onend = () => {
    const index = utteranceRef.indexOf(utterance);
    if (index > -1) {
        utteranceRef.splice(index, 1);
    }
  };
  utteranceRef.push(utterance);

  let selectedVoice: SpeechSynthesisVoice | undefined;

  if (voiceURI) {
    selectedVoice = allVoices.find(voice => voice.voiceURI === voiceURI);
  }
  
  // If no specific voice is set or found, try to find one for the language
  if (!selectedVoice && lang) {
    const langVoices = allVoices.filter(v => v.lang.startsWith(lang));
    if (langVoices.length > 0) {
      // Prefer a non-"Google" voice if available, they sometimes sound more natural
      selectedVoice = langVoices.find(v => !v.name.includes("Google")) || langVoices[0];
    }
  }

  if (selectedVoice) {
    utterance.voice = selectedVoice;
  }

  // Set lang property on utterance for better pronunciation even with default voice
  if (lang) {
    utterance.lang = lang;
  }

  window.speechSynthesis.speak(utterance);
};

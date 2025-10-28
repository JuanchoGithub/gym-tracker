import { useState, useEffect, useContext, useCallback } from 'react';
import { AppContext } from '../contexts/AppContext';

export const useSpeechSynthesis = () => {
  const { selectedVoiceURI } = useContext(AppContext);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setIsSupported(true);

      const loadVoices = () => {
        setVoices(window.speechSynthesis.getVoices());
      };

      loadVoices();
      // onvoiceschanged is fired when the list of voices is ready
      window.speechSynthesis.onvoiceschanged = loadVoices;

      return () => {
        window.speechSynthesis.onvoiceschanged = null;
      };
    }
  }, []);

  const speak = useCallback((text: string, voiceOverride?: SpeechSynthesisVoice) => {
    if (!isSupported || !text) return;

    // Add resume() call to "wake up" the speech engine, especially on mobile browsers.
    window.speechSynthesis.resume();
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    const voiceToUse = voiceOverride || voices.find(voice => voice.voiceURI === selectedVoiceURI);

    if (voiceToUse) {
      utterance.voice = voiceToUse;
    }
    // If no voice is selected or found, the browser will use its default.

    window.speechSynthesis.speak(utterance);
  }, [isSupported, selectedVoiceURI, voices]);

  const cancel = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
  }, [isSupported]);

  return { speak, cancel, voices, isSupported };
};

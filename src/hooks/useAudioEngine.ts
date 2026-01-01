import { useCallback, useRef, useEffect } from 'react';

// Frequencies for each color (musical notes)
const COLOR_FREQUENCIES: Record<string, number> = {
  red: 261.63,    // C4
  blue: 293.66,   // D4
  green: 329.63,  // E4
  yellow: 349.23, // F4
  purple: 392.00, // G4
  orange: 440.00, // A4
  cyan: 493.88,   // B4
  pink: 523.25,   // C5
  lime: 587.33,   // D5
};

// Positive feedback phrases
const SUCCESS_PHRASES = [
  'Good move!',
  'Great!',
  'Awesome!',
  'Perfect!',
  'Nice one!',
  'Excellent!',
  'Amazing!',
  'Superb!',
];

export const useAudioEngine = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const backgroundOscRef = useRef<OscillatorNode | null>(null);
  const backgroundGainRef = useRef<GainNode | null>(null);
  const isPlayingBackgroundRef = useRef(false);

  // Initialize audio context
  const initAudio = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    // Resume if suspended (browser autoplay policy)
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  // Play a color tone
  const playColorTone = useCallback((color: string, duration: number = 300) => {
    const ctx = initAudio();
    const frequency = COLOR_FREQUENCIES[color] || 440;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

    // Envelope for smooth sound
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration / 1000);
  }, [initAudio]);

  // Play success sound (ascending arpeggio)
  const playSuccessSound = useCallback(() => {
    const ctx = initAudio();
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5

    notes.forEach((freq, index) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(freq, ctx.currentTime);

      const startTime = ctx.currentTime + index * 0.1;
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.2, startTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);

      oscillator.start(startTime);
      oscillator.stop(startTime + 0.3);
    });
  }, [initAudio]);

  // Play error sound (descending buzz)
  const playErrorSound = useCallback(() => {
    const ctx = initAudio();

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(200, ctx.currentTime);
    oscillator.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.5);

    gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.5);
  }, [initAudio]);

  // Play level complete fanfare
  const playLevelComplete = useCallback(() => {
    const ctx = initAudio();
    const notes = [392, 523.25, 659.25, 783.99, 1046.5]; // G4, C5, E5, G5, C6

    notes.forEach((freq, index) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(freq, ctx.currentTime);

      const startTime = ctx.currentTime + index * 0.08;
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.15, startTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);

      oscillator.start(startTime);
      oscillator.stop(startTime + 0.4);
    });
  }, [initAudio]);

  // Start background ambient music
  const startBackgroundMusic = useCallback(() => {
    if (isPlayingBackgroundRef.current) return;

    const ctx = initAudio();
    
    // Create a subtle ambient drone
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.type = 'sine';
    osc2.type = 'sine';
    osc1.frequency.setValueAtTime(65.41, ctx.currentTime); // C2
    osc2.frequency.setValueAtTime(98.00, ctx.currentTime); // G2

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(200, ctx.currentTime);

    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 2);

    osc1.start(ctx.currentTime);
    osc2.start(ctx.currentTime);

    backgroundOscRef.current = osc1;
    backgroundGainRef.current = gainNode;
    isPlayingBackgroundRef.current = true;

    // Subtle modulation
    const modulate = () => {
      if (!isPlayingBackgroundRef.current) return;
      const now = ctx.currentTime;
      osc2.frequency.setValueAtTime(98 + Math.sin(now * 0.5) * 5, now);
      requestAnimationFrame(modulate);
    };
    modulate();
  }, [initAudio]);

  // Stop background music
  const stopBackgroundMusic = useCallback(() => {
    if (backgroundGainRef.current && audioContextRef.current) {
      const ctx = audioContextRef.current;
      backgroundGainRef.current.gain.linearRampToValueAtTime(0, ctx.currentTime + 1);
      setTimeout(() => {
        backgroundOscRef.current?.stop();
        isPlayingBackgroundRef.current = false;
      }, 1000);
    }
  }, []);

  // Get random success phrase
  const getRandomSuccessPhrase = useCallback(() => {
    return SUCCESS_PHRASES[Math.floor(Math.random() * SUCCESS_PHRASES.length)];
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopBackgroundMusic();
      audioContextRef.current?.close();
    };
  }, [stopBackgroundMusic]);

  return {
    initAudio,
    playColorTone,
    playSuccessSound,
    playErrorSound,
    playLevelComplete,
    startBackgroundMusic,
    stopBackgroundMusic,
    getRandomSuccessPhrase,
  };
};

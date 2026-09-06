/**
 * CompAlumim - Web Audio Engine • בית הספר עלומים חולון
 * Features:
 * - Cheerful UI button tap / pop sound
 * - Celebratory booking saved chime (arpeggio)
 * - Gentle deletion whoosh
 * - Multiple upbeat, cheerful Israeli & school melodies with random selection:
 *   1. יונתן הקטן (Israeli Kids Classic)
 *   2. עוגה עוגה (Israeli School Circle Song)
 *   3. משחק שמח (Bouncy Chiptune Playground)
 *   4. הבה נגילה (Festive Israeli Celebration)
 */

const SoundFX = (() => {
  const KEY_SOUND_ENABLED = 'compalumim_sound_fx';
  const KEY_MELODY_ENABLED = 'compalumim_melody';

  let audioCtx = null;
  let soundEnabled = localStorage.getItem(KEY_SOUND_ENABLED) !== 'false';
  let melodyEnabled = localStorage.getItem(KEY_MELODY_ENABLED) === 'true';

  let melodyTimer = null;
  let currentTuneIndex = 0;
  let currentStep = 0;

  // Note Frequencies in Hz
  const N = {
    C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
    C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.00, B5: 987.77,
    C6: 1046.50, REST: 0
  };

  // 4 Cheerful, Upbeat Melodies
  const TUNES = [
    {
      id: 'yonatan',
      name: 'יונתן הקטן',
      tempoMs: 210,
      notes: [
        N.G4, N.E4, N.E4, N.REST, N.F4, N.D4, N.D4, N.REST,
        N.C4, N.D4, N.E4, N.F4, N.G4, N.G4, N.G4, N.REST,
        N.G4, N.E4, N.E4, N.REST, N.F4, N.D4, N.D4, N.REST,
        N.C4, N.E4, N.G4, N.G4, N.C4, N.REST, N.REST, N.REST
      ]
    },
    {
      id: 'uga',
      name: 'עוגה עוגה',
      tempoMs: 190,
      notes: [
        N.G4, N.G4, N.E4, N.REST, N.G4, N.G4, N.E4, N.REST,
        N.G4, N.A4, N.G4, N.F4, N.E4, N.D4, N.C4, N.REST,
        N.E4, N.E4, N.G4, N.G4, N.E4, N.E4, N.G4, N.REST,
        N.A4, N.A4, N.G4, N.F4, N.E4, N.D4, N.C4, N.REST
      ]
    },
    {
      id: 'playground',
      name: 'משחק שמח בחצר',
      tempoMs: 175,
      notes: [
        N.C5, N.E5, N.G5, N.A5, N.G5, N.E5, N.C5, N.REST,
        N.D5, N.F5, N.A5, N.G5, N.E5, N.C5, N.D5, N.REST,
        N.E5, N.G5, N.C6, N.A5, N.G5, N.E5, N.D5, N.REST,
        N.C5, N.E5, N.G5, N.D5, N.C5, N.REST, N.REST, N.REST
      ]
    },
    {
      id: 'chagiga',
      name: 'חגיגה עליזה',
      tempoMs: 200,
      notes: [
        N.D4, N.E4, N.F4, N.E4, N.D4, N.REST, N.E4, N.REST,
        N.F4, N.G4, N.A4, N.G4, N.F4, N.REST, N.G4, N.REST,
        N.A4, N.B4, N.C5, N.B4, N.A4, N.G4, N.F4, N.E4,
        N.D4, N.F4, N.A4, N.F4, N.D4, N.REST, N.REST, N.REST
      ]
    }
  ];

  function getAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  /**
   * Cheerful button tap (bubble/pop sound)
   */
  function playClick() {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(680, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(260, ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.06);
    } catch (e) {}
  }

  /**
   * Celebratory chime when a booking is saved
   */
  function playSuccess() {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, index) => {
        const startTime = ctx.currentTime + index * 0.08;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.16, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.28);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.29);
      });
    } catch (e) {}
  }

  /**
   * Gentle deletion sound
   */
  function playDelete() {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(340, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.13);
    } catch (e) {}
  }

  /**
   * Start a randomly selected cheerful melody
   */
  function startRandomMelody() {
    // Pick a random tune different from previous
    let nextIndex = Math.floor(Math.random() * TUNES.length);
    if (TUNES.length > 1 && nextIndex === currentTuneIndex) {
      nextIndex = (nextIndex + 1) % TUNES.length;
    }
    currentTuneIndex = nextIndex;
    currentStep = 0;

    const tune = TUNES[currentTuneIndex];
    stopMelody();

    const ctx = getAudioContext();
    if (!ctx) return;

    melodyTimer = setInterval(() => {
      if (!melodyEnabled) {
        stopMelody();
        return;
      }
      playTuneNote(tune);
    }, tune.tempoMs);

    return tune.name;
  }

  function playTuneNote(tune) {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const freq = tune.notes[currentStep % tune.notes.length];
      currentStep++;

      if (!freq || freq <= 0) return; // Rest note

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Warm, bouncy toy-piano / marimba tone
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      const noteDuration = (tune.tempoMs / 1000) * 0.85;
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + noteDuration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + noteDuration + 0.02);
    } catch (e) {}
  }

  function stopMelody() {
    if (melodyTimer) {
      clearInterval(melodyTimer);
      melodyTimer = null;
    }
  }

  /**
   * Toggle Sound Effects (Tap / Chime)
   */
  function toggleSound() {
    soundEnabled = !soundEnabled;
    localStorage.setItem(KEY_SOUND_ENABLED, soundEnabled ? 'true' : 'false');
    if (soundEnabled) playClick();
    updateUI();
    return soundEnabled;
  }

  /**
   * Toggle or Switch to next cheerful melody
   */
  function toggleMelody() {
    if (!melodyEnabled) {
      melodyEnabled = true;
      localStorage.setItem(KEY_MELODY_ENABLED, 'true');
      const tuneName = startRandomMelody();
      updateUI();
      return { active: true, name: tuneName };
    } else {
      melodyEnabled = false;
      localStorage.setItem(KEY_MELODY_ENABLED, 'false');
      stopMelody();
      updateUI();
      return { active: false, name: null };
    }
  }

  function isSoundEnabled() {
    return soundEnabled;
  }

  function isMelodyEnabled() {
    return melodyEnabled;
  }

  function updateUI() {
    const btnSound = document.getElementById('btnSoundToggle');
    if (btnSound) {
      btnSound.textContent = soundEnabled ? '🔊' : '🔇';
      btnSound.title = soundEnabled ? 'השתקת צלילים' : 'הפעלת צלילי כפתורים';
    }

    const btnMelody = document.getElementById('btnMelodyToggle');
    if (btnMelody) {
      btnMelody.textContent = melodyEnabled ? '🎵' : '🎶';
      btnMelody.classList.toggle('playing', melodyEnabled);
      const currentName = TUNES[currentTuneIndex]?.name || '';
      btnMelody.title = melodyEnabled ? `עצירת מנגינה (${currentName})` : 'הפעלת מנגינת בית ספר עליזה';
    }
  }

  function init() {
    updateUI();

    const btnSound = document.getElementById('btnSoundToggle');
    if (btnSound) {
      btnSound.addEventListener('click', () => {
        const state = toggleSound();
        App.showToast(state ? 'צלילים הופעלו 🔊' : 'צלילים הושתקו 🔇', 'info', 1400);
      });
    }

    const btnMelody = document.getElementById('btnMelodyToggle');
    if (btnMelody) {
      btnMelody.addEventListener('click', () => {
        const res = toggleMelody();
        if (res.active) {
          App.showToast(`מנגינה עליזה: ${res.name} 🎵`, 'success', 2200);
        } else {
          App.showToast('מנגינת רקע כבויה 🎶', 'info', 1400);
        }
      });
    }

    // Auto-resume audio on first user touch / click
    const unlockAudio = () => {
      getAudioContext();
      if (melodyEnabled && !melodyTimer) {
        startRandomMelody();
      }
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
    };
    document.addEventListener('click', unlockAudio);
    document.addEventListener('touchstart', unlockAudio);
  }

  return {
    init,
    playClick,
    playSuccess,
    playDelete,
    toggleSound,
    toggleMelody,
    isSoundEnabled,
    isMelodyEnabled
  };
})();

// Export globally
window.SoundFX = SoundFX;

/**
 * CompAlumim - Advanced Web Audio Relaxation Synthesizer & SoundFX Engine
 * בית הספר עלומים חולון
 * 
 * Architecture:
 * - Multi-Track Polyphonic Stereo Synthesizer (Drums, Sub-Bass, Strings/Rhodes Chords, Lead Melody)
 * - Studio-grade Master Compressor and Stereo Spatializer
 * - 4 Selectable Relaxation Styles:
 *   1. ☕ Jazz / Bossa Lounge (Chords: Dm9 - G13 - Cmaj9 - Am9)
 *   2. 🌴 Pop / Lo-Fi Chill (Chords: Fmaj7 - Em7 - Dm7 - Cmaj7)
 *   3. 🎸 Mellow Rock Ballad (Chords: Am - Fmaj7 - C - G)
 *   4. 🌌 Lyrical / Ambient Meditative (Chords: C#m7 - Aadd9 - Emaj7 - B)
 * - Tactile Apple-grade UI SoundFX (Bubble/Haptic tap, crystal chime, smooth whoosh)
 */

const SoundFX = (() => {
  const KEY_SOUND_ENABLED = 'compalumim_sound_fx';
  const KEY_MELODY_ENABLED = 'compalumim_melody';
  const KEY_MELODY_STYLE = 'compalumim_melody_style';

  let audioCtx = null;
  let masterGain = null;
  let masterCompressor = null;

  let soundEnabled = localStorage.getItem(KEY_SOUND_ENABLED) !== 'false';
  let melodyEnabled = localStorage.getItem(KEY_MELODY_ENABLED) === 'true';
  let currentStyleId = localStorage.getItem(KEY_MELODY_STYLE) || 'jazz';

  let stepTimer = null;
  let currentStep = 0;

  // Note frequency table (Hz)
  const NOTES = {
    REST: 0,
    C2: 65.41, D2: 73.42, E2: 82.41, F2: 87.31, G2: 98.00, A2: 110.00, B2: 123.47,
    C3: 130.81, D3: 146.83, Eb3: 155.56, E3: 164.81, F3: 174.61, Fs3: 185.00, G3: 196.00, Ab3: 207.65, A3: 220.00, Bb3: 233.08, B3: 246.94,
    C4: 261.63, Cs4: 277.18, D4: 293.66, Eb4: 311.13, E4: 329.63, F4: 349.23, Fs4: 369.99, G4: 392.00, Ab4: 415.30, A4: 440.00, Bb4: 466.16, B4: 493.88,
    C5: 523.25, Cs5: 554.37, D5: 587.33, Eb5: 622.25, E5: 659.25, F5: 698.46, Fs5: 739.99, G5: 783.99, Ab5: 830.61, A5: 880.00, Bb5: 932.33, B5: 987.77,
    C6: 1046.50, D6: 1174.66, E6: 1318.51, G6: 1567.98
  };

  // 4 Rich, Polyphonic Relaxation Styles (16-step patterns)
  const STYLES = {
    jazz: {
      id: 'jazz',
      name: 'ג׳אז ובוסה',
      icon: '☕',
      bpm: 108,
      stepMs: 138, // 16th-note subdivision
      chords: [
        // Dm9 (steps 0..3)
        [NOTES.D3, NOTES.F3, NOTES.A3, NOTES.C4, NOTES.E4],
        // G13 (steps 4..7)
        [NOTES.G2, NOTES.F3, NOTES.B3, NOTES.E4],
        // Cmaj9 (steps 8..11)
        [NOTES.C3, NOTES.E3, NOTES.G3, NOTES.B3, NOTES.D4],
        // Am9 (steps 12..15)
        [NOTES.A2, NOTES.G3, NOTES.C4, NOTES.E4, NOTES.B4]
      ],
      bass: [
        NOTES.D2, 0, NOTES.A2, 0,
        NOTES.G2, 0, NOTES.D2, NOTES.F2,
        NOTES.C2, 0, NOTES.G2, 0,
        NOTES.A2, 0, NOTES.E2, NOTES.G2
      ],
      drums: [
        { kick: true, hat: true },
        { hat: true },
        { hat: true },
        { snare: true, hat: true },
        { hat: true },
        { kick: true, hat: true },
        { hat: true },
        { snare: true, hat: true },
        { kick: true, hat: true },
        { hat: true },
        { hat: true },
        { snare: true, hat: true },
        { kick: true, hat: true },
        { hat: true },
        { kick: true, hat: true },
        { snare: true, openHat: true }
      ],
      melody: [
        NOTES.E5, 0, NOTES.G5, NOTES.A5,
        NOTES.B5, 0, NOTES.A5, 0,
        NOTES.G5, NOTES.E5, 0, NOTES.D5,
        NOTES.C5, 0, NOTES.D5, NOTES.E5
      ]
    },

    lofi: {
      id: 'lofi',
      name: 'צ׳יל ולו-פיי',
      icon: '🌴',
      bpm: 82,
      stepMs: 182,
      chords: [
        // Fmaj7
        [NOTES.F3, NOTES.A3, NOTES.C4, NOTES.E4],
        // Em7
        [NOTES.E3, NOTES.G3, NOTES.B3, NOTES.D4],
        // Dm7
        [NOTES.D3, NOTES.F3, NOTES.A3, NOTES.C4],
        // Cmaj7
        [NOTES.C3, NOTES.E3, NOTES.G3, NOTES.B3]
      ],
      bass: [
        NOTES.F2, 0, 0, NOTES.F2,
        NOTES.E2, 0, 0, 0,
        NOTES.D2, 0, 0, NOTES.D2,
        NOTES.C2, 0, NOTES.G2, 0
      ],
      drums: [
        { kick: true, hat: true },
        { hat: true },
        { hat: true },
        { hat: true },
        { snare: true, hat: true },
        { hat: true },
        { kick: true, hat: true },
        { hat: true },
        { kick: true, hat: true },
        { hat: true },
        { hat: true },
        { hat: true },
        { snare: true, hat: true },
        { hat: true },
        { kick: true, hat: true },
        { hat: true, openHat: true }
      ],
      melody: [
        NOTES.A4, NOTES.C5, NOTES.E5, 0,
        NOTES.D5, 0, NOTES.B4, 0,
        NOTES.F4, NOTES.A4, NOTES.C5, 0,
        NOTES.B4, 0, NOTES.G4, 0
      ]
    },

    rock: {
      id: 'rock',
      name: 'רוק בלדה',
      icon: '🎸',
      bpm: 72,
      stepMs: 208,
      chords: [
        // Am
        [NOTES.A2, NOTES.C3, NOTES.E3, NOTES.A3],
        // Fmaj7
        [NOTES.F2, NOTES.C3, NOTES.E3, NOTES.A3],
        // C
        [NOTES.C3, NOTES.E3, NOTES.G3, NOTES.C4],
        // G
        [NOTES.G2, NOTES.D3, NOTES.G3, NOTES.B3]
      ],
      bass: [
        NOTES.A2, 0, NOTES.A2, 0,
        NOTES.F2, 0, NOTES.F2, 0,
        NOTES.C2, 0, NOTES.C2, 0,
        NOTES.G2, 0, NOTES.G2, 0
      ],
      drums: [
        { kick: true, hat: true },
        { hat: true },
        { hat: true },
        { hat: true },
        { snare: true, hat: true },
        { hat: true },
        { kick: true, hat: true },
        { hat: true },
        { kick: true, hat: true },
        { kick: true, hat: true },
        { hat: true },
        { hat: true },
        { snare: true, hat: true },
        { hat: true },
        { kick: true, hat: true },
        { openHat: true }
      ],
      melody: [
        NOTES.C5, 0, NOTES.B4, NOTES.A4,
        NOTES.C5, 0, NOTES.D5, NOTES.E5,
        NOTES.G5, 0, NOTES.E5, 0,
        NOTES.D5, 0, NOTES.C5, 0
      ]
    },

    ambient: {
      id: 'ambient',
      name: 'לירי ומדיטטיבי',
      icon: '🌌',
      bpm: 58,
      stepMs: 258,
      chords: [
        // C#m7
        [NOTES.Cs4, NOTES.E4, NOTES.Gs4, NOTES.B4],
        // Aadd9
        [NOTES.A3, NOTES.Cs4, NOTES.E4, NOTES.B4],
        // Emaj7
        [NOTES.E3, NOTES.B3, NOTES.Eb4, NOTES.Gs4],
        // Bsus4
        [NOTES.B2, NOTES.Fs3, NOTES.B3, NOTES.E4]
      ],
      bass: [
        NOTES.Cs2, 0, 0, 0,
        NOTES.A2,  0, 0, 0,
        NOTES.E2,  0, 0, 0,
        NOTES.B2,  0, 0, 0
      ],
      drums: [
        { kick: true, hat: true },
        { hat: true },
        { hat: true },
        { hat: true },
        { hat: true },
        { hat: true },
        { hat: true },
        { hat: true },
        { kick: true, hat: true },
        { hat: true },
        { hat: true },
        { hat: true },
        { hat: true },
        { hat: true },
        { hat: true },
        { openHat: true }
      ],
      melody: [
        NOTES.Gs5, 0, NOTES.B5, 0,
        NOTES.Cs6, 0, NOTES.B5, 0,
        NOTES.Gs5, 0, NOTES.Fs5, 0,
        NOTES.E5,  0, NOTES.Fs5, 0
      ]
    }
  };

  /**
   * AudioContext Initialization with Master Compressor and Stereo Stage
   */
  function getAudioContext() {
    if (!audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        audioCtx = new AudioCtx();

        // Master Compressor for warm, glued, punchy studio sound
        masterCompressor = audioCtx.createDynamicsCompressor();
        masterCompressor.threshold.setValueAtTime(-14, audioCtx.currentTime);
        masterCompressor.knee.setValueAtTime(10, audioCtx.currentTime);
        masterCompressor.ratio.setValueAtTime(3.5, audioCtx.currentTime);
        masterCompressor.attack.setValueAtTime(0.003, audioCtx.currentTime);
        masterCompressor.release.setValueAtTime(0.25, audioCtx.currentTime);

        // Master Gain
        masterGain = audioCtx.createGain();
        masterGain.gain.setValueAtTime(0.75, audioCtx.currentTime);

        masterCompressor.connect(masterGain);
        masterGain.connect(audioCtx.destination);
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function createStereoPanner(ctx, panValue = 0) {
    if (typeof ctx.createStereoPanner === 'function') {
      const panner = ctx.createStereoPanner();
      panner.pan.setValueAtTime(panValue, ctx.currentTime);
      return panner;
    }
    // Fallback gain if StereoPanner is unsupported
    return ctx.createGain();
  }

  // ── Multi-Track Synthesis Engines ──

  /**
   * 1. Drum Machine: Kick, Snare/Rim, Hi-Hat
   */
  function playKick(ctx, time) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(135, time);
    osc.frequency.exponentialRampToValueAtTime(38, time + 0.12);

    gain.gain.setValueAtTime(0.38, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

    osc.connect(gain);
    gain.connect(masterCompressor);

    osc.start(time);
    osc.stop(time + 0.2);
  }

  function playSnare(ctx, time) {
    // Noise buffer for snap
    const bufferSize = ctx.sampleRate * 0.12;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.035));
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, time);
    filter.Q.setValueAtTime(1.8, time);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.18, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

    whiteNoise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(masterCompressor);

    // Tone body
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, time);
    osc.frequency.exponentialRampToValueAtTime(70, time + 0.08);

    oscGain.gain.setValueAtTime(0.12, time);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.09);

    osc.connect(oscGain);
    oscGain.connect(masterCompressor);

    whiteNoise.start(time);
    osc.start(time);
    osc.stop(time + 0.1);
  }

  function playHiHat(ctx, time, isOpen = false) {
    const dur = isOpen ? 0.22 : 0.045;
    const bufferSize = ctx.sampleRate * dur;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1);
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(8000, time);

    const panner = createStereoPanner(ctx, isOpen ? -0.3 : 0.35);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(isOpen ? 0.09 : 0.06, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);

    whiteNoise.connect(filter);
    filter.connect(panner);
    panner.connect(gain);
    gain.connect(masterCompressor);

    whiteNoise.start(time);
  }

  /**
   * 2. Deep Warm Sub-Bass Synthesizer
   */
  function playBassNote(ctx, freq, time, dur) {
    if (!freq || freq <= 0) return;

    // Sub-oscillator (sine)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, time);

    // Warm body (triangle with lowpass)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq, time);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(320, time);

    gain1.gain.setValueAtTime(0.22, time);
    gain1.gain.exponentialRampToValueAtTime(0.001, time + dur * 0.95);

    gain2.gain.setValueAtTime(0.12, time);
    gain2.gain.exponentialRampToValueAtTime(0.001, time + dur * 0.9);

    osc1.connect(gain1);
    gain1.connect(masterCompressor);

    osc2.connect(filter);
    filter.connect(gain2);
    gain2.connect(masterCompressor);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + dur);
    osc2.stop(time + dur);
  }

  /**
   * 3. Polyphonic Strings & Warm Rhodes Pad Chords (Stereo Wide)
   */
  function playChord(ctx, notesArr, time, dur) {
    if (!notesArr || !notesArr.length) return;

    notesArr.forEach((freq, idx) => {
      // Dual detuned oscillators for lush analog chorus
      const oscA = ctx.createOscillator();
      const oscB = ctx.createOscillator();
      const gain = ctx.createGain();

      oscA.type = 'sawtooth';
      oscB.type = 'triangle';

      oscA.frequency.setValueAtTime(freq, time);
      oscA.detune.setValueAtTime(-6, time);

      oscB.frequency.setValueAtTime(freq, time);
      oscB.detune.setValueAtTime(+6, time);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, time);
      filter.Q.setValueAtTime(1.0, time);

      // Stereo pan based on voice index
      const pan = (idx % 2 === 0 ? -0.4 : 0.4) * (0.5 + idx * 0.15);
      const panner = createStereoPanner(ctx, pan);

      // Soft swell attack and release
      const attack = dur * 0.2;
      const release = dur * 0.4;
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.linearRampToValueAtTime(0.035, time + attack);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + dur + release);

      oscA.connect(filter);
      oscB.connect(filter);
      filter.connect(panner);
      panner.connect(gain);
      gain.connect(masterCompressor);

      oscA.start(time);
      oscB.start(time);
      oscA.stop(time + dur + release + 0.05);
      oscB.stop(time + dur + release + 0.05);
    });
  }

  /**
   * 4. Lead Relaxing Melody Synthesizer (Vibraphone / Soft Flute)
   */
  function playMelodyNote(ctx, freq, time, dur) {
    if (!freq || freq <= 0) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);

    // Harmonic overtone for natural timbre
    const overtone = ctx.createOscillator();
    const overtoneGain = ctx.createGain();
    overtone.type = 'sine';
    overtone.frequency.setValueAtTime(freq * 2, time);

    overtoneGain.gain.setValueAtTime(0.015, time);
    overtoneGain.gain.exponentialRampToValueAtTime(0.0001, time + dur * 0.6);

    const panner = createStereoPanner(ctx, 0.15);

    gain.gain.setValueAtTime(0.06, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);

    osc.connect(panner);
    overtone.connect(overtoneGain);
    overtoneGain.connect(panner);
    panner.connect(gain);
    gain.connect(masterCompressor);

    osc.start(time);
    overtone.start(time);
    osc.stop(time + dur + 0.05);
    overtone.stop(time + dur + 0.05);
  }

  // ── Step Sequencer Loop ──

  function startMelodyLoop() {
    stopMelodyLoop();

    const ctx = getAudioContext();
    if (!ctx) return;

    const style = STYLES[currentStyleId] || STYLES.jazz;
    currentStep = 0;

    stepTimer = setInterval(() => {
      if (!melodyEnabled) {
        stopMelodyLoop();
        return;
      }
      tickStep(style);
    }, style.stepMs);
  }

  function tickStep(style) {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const stepIdx = currentStep % 16;
      const stepDur = style.stepMs / 1000;

      // 1. Drums
      const drumInfo = style.drums[stepIdx];
      if (drumInfo) {
        if (drumInfo.kick) playKick(ctx, now);
        if (drumInfo.snare) playSnare(ctx, now);
        if (drumInfo.hat) playHiHat(ctx, now, !!drumInfo.openHat);
      }

      // 2. Bass (every 8th or step)
      const bassFreq = style.bass[stepIdx];
      if (bassFreq) {
        playBassNote(ctx, bassFreq, now, stepDur * 1.8);
      }

      // 3. Polyphonic Chords: trigger on chord changes (steps 0, 4, 8, 12)
      if (stepIdx % 4 === 0) {
        const chordIdx = Math.floor(stepIdx / 4);
        const chordNotes = style.chords[chordIdx];
        playChord(ctx, chordNotes, now, stepDur * 3.8);
      }

      // 4. Lead Melody
      const melodyFreq = style.melody[stepIdx];
      if (melodyFreq) {
        playMelodyNote(ctx, melodyFreq, now, stepDur * 1.6);
      }

      currentStep++;
    } catch (e) {
      console.warn('Synth step error:', e);
    }
  }

  function stopMelodyLoop() {
    if (stepTimer) {
      clearInterval(stepTimer);
      stepTimer = null;
    }
  }

  // ── Tactile Apple-grade UI Sound Effects ──

  /**
   * Modern tactile bubble / haptic tap
   */
  function playClick() {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      // High-pass micro-click
      const click = ctx.createOscillator();
      const clickGain = ctx.createGain();
      click.type = 'sine';
      click.frequency.setValueAtTime(1200, now);
      click.frequency.exponentialRampToValueAtTime(320, now + 0.025);

      clickGain.gain.setValueAtTime(0.09, now);
      clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

      click.connect(clickGain);
      clickGain.connect(masterCompressor);

      click.start(now);
      click.stop(now + 0.035);
    } catch (e) {}
  }

  /**
   * Crystal glass celebratory chime (Lush stereo arpeggio)
   */
  function playSuccess() {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      // Sparkling pentatonic crystal chime
      const freqs = [587.33, 739.99, 880.00, 1174.66, 1479.98]; // D5, F#5, A5, D6, F#6
      freqs.forEach((freq, i) => {
        const t = ctx.currentTime + i * 0.055;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const panner = createStereoPanner(ctx, (i % 2 === 0 ? -0.4 : 0.4));

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);

        osc.connect(panner);
        panner.connect(gain);
        gain.connect(masterCompressor);

        osc.start(t);
        osc.stop(t + 0.46);
      });
    } catch (e) {}
  }

  /**
   * Smooth paper / card swipe deletion sound
   */
  function playDelete() {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(85, now + 0.12);

      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(masterCompressor);

      osc.start(now);
      osc.stop(now + 0.13);
    } catch (e) {}
  }

  // ── Public Controls & Style Selection ──

  function toggleSound() {
    soundEnabled = !soundEnabled;
    localStorage.setItem(KEY_SOUND_ENABLED, soundEnabled ? 'true' : 'false');
    if (soundEnabled) playClick();
    updateUI();
    return soundEnabled;
  }

  function toggleMelody() {
    if (!melodyEnabled) {
      melodyEnabled = true;
      localStorage.setItem(KEY_MELODY_ENABLED, 'true');
      startMelodyLoop();
      updateUI();
      const style = STYLES[currentStyleId] || STYLES.jazz;
      return { active: true, name: style.name, icon: style.icon };
    } else {
      melodyEnabled = false;
      localStorage.setItem(KEY_MELODY_ENABLED, 'false');
      stopMelodyLoop();
      updateUI();
      return { active: false, name: null };
    }
  }

  function cycleStyle() {
    const keys = Object.keys(STYLES);
    const currIdx = keys.indexOf(currentStyleId);
    const nextIdx = (currIdx + 1) % keys.length;
    setStyle(keys[nextIdx]);
    return STYLES[keys[nextIdx]];
  }

  function setStyle(styleId) {
    if (!STYLES[styleId]) return;
    currentStyleId = styleId;
    localStorage.setItem(KEY_MELODY_STYLE, styleId);
    if (melodyEnabled) {
      startMelodyLoop();
    }
    updateUI();
  }

  function getCurrentStyle() {
    return STYLES[currentStyleId] || STYLES.jazz;
  }

  function getStyles() {
    return Object.values(STYLES);
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
      btnMelody.classList.toggle('playing', melodyEnabled);
      const style = getCurrentStyle();
      btnMelody.title = melodyEnabled ? `עצירת מוזיקה (${style.name})` : 'הפעלת מוזיקת רגיעה סטריאופונית';
    }

    const styleLabel = document.getElementById('melodyStyleLabel');
    if (styleLabel) {
      const style = getCurrentStyle();
      styleLabel.textContent = `${style.icon} ${style.name}`;
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
          App.showToast(`מוזיקת רגיעה מופעלת: ${res.icon} ${res.name}`, 'success', 2400);
        } else {
          App.showToast('מוזיקת רגיעה כבויה 🎶', 'info', 1400);
        }
      });
    }

    const btnStyle = document.getElementById('btnMelodyStyle');
    if (btnStyle) {
      btnStyle.addEventListener('click', () => {
        playClick();
        const nextStyle = cycleStyle();
        App.showToast(`סגנון מוזיקה: ${nextStyle.icon} ${nextStyle.name}`, 'info', 2000);
      });
    }

    // Auto-resume audio on first user touch / click
    const unlockAudio = () => {
      getAudioContext();
      if (melodyEnabled && !stepTimer) {
        startMelodyLoop();
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
    cycleStyle,
    setStyle,
    getCurrentStyle,
    getStyles,
    isSoundEnabled,
    isMelodyEnabled
  };
})();

// Export globally
window.SoundFX = SoundFX;

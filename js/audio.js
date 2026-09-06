/**
 * CompAlumim - Real MP3 Music Player & Tactile SoundFX Engine
 * בית הספר עלומים חולון
 * 
 * Features:
 * - 100% Real Studio MP3 Audio (No robotic synthesizers!)
 * - 7 Calming Relaxation Tracks in the audio/ folder:
 *   1. ☕ ג'אז קפה רגוע (track1.mp3)
 *   2. 🎹 פסנתר שלווה ורוגע (track2.mp3)
 *   3. 🌴 צ'יל ולו-פיי עדין (track3.mp3)
 *   4. 🎸 גיטרה אקוסטית חמימה (track4.mp3)
 *   5. 🌿 מדיטציה ורוגע נפשי (track5.mp3)
 *   6. 🌧️ גשם עדין ופסנתר (track6.mp3)
 *   7. 🌅 שקיעה חלומית (track7.mp3)
 * - Automatic detection of local files with elegant fallback
 * - Soft fade-in and smooth volume control
 * - Dynamic 3-Bar Equalizer animation
 * - Subtle Apple-grade UI haptic click sounds
 */

const SoundFX = (() => {
  const KEY_SOUND_ENABLED = 'compalumim_sound_fx';
  const KEY_MELODY_ENABLED = 'compalumim_melody';
  const KEY_TRACK_INDEX = 'compalumim_track_index';

  let soundEnabled = localStorage.getItem(KEY_SOUND_ENABLED) !== 'false';
  let melodyEnabled = localStorage.getItem(KEY_MELODY_ENABLED) === 'true';
  let currentTrackIndex = parseInt(localStorage.getItem(KEY_TRACK_INDEX) || '0', 10);

  // 7 Calming MP3 Tracks
  const TRACKS = [
    {
      id: 'track1',
      num: 1,
      name: 'ג׳אז קפה רגוע',
      icon: '☕',
      localSrc: 'audio/track1.mp3',
      fallbackSrc: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3'
    },
    {
      id: 'track2',
      num: 2,
      name: 'פסנתר שלווה ורוגע',
      icon: '🎹',
      localSrc: 'audio/track2.mp3',
      fallbackSrc: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=relaxed-vlog-night-street-131746.mp3'
    },
    {
      id: 'track3',
      num: 3,
      name: 'צ׳יל ולו-פיי עדין',
      icon: '🌴',
      localSrc: 'audio/track3.mp3',
      fallbackSrc: 'https://cdn.pixabay.com/download/audio/2022/10/14/audio_9939f77cb7.mp3?filename=ambient-piano-amp-strings-10711.mp3'
    },
    {
      id: 'track4',
      num: 4,
      name: 'גיטרה אקוסטית חמימה',
      icon: '🎸',
      localSrc: 'audio/track4.mp3',
      fallbackSrc: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=acoustic-guitar-relaxing-110254.mp3'
    },
    {
      id: 'track5',
      num: 5,
      name: 'מדיטציה ורוגע נפשי',
      icon: '🌿',
      localSrc: 'audio/track5.mp3',
      fallbackSrc: 'https://cdn.pixabay.com/download/audio/2021/08/04/audio_12b0c7443c.mp3?filename=meditation-piano-9826.mp3'
    },
    {
      id: 'track6',
      num: 6,
      name: 'גשם עדין ופסנתר',
      icon: '🌧️',
      localSrc: 'audio/track6.mp3',
      fallbackSrc: 'https://cdn.pixabay.com/download/audio/2022/04/27/audio_30b65f725a.mp3?filename=soft-rain-ambient-111154.mp3'
    },
    {
      id: 'track7',
      num: 7,
      name: 'שקיעה חלומית',
      icon: '🌅',
      localSrc: 'audio/track7.mp3',
      fallbackSrc: 'https://cdn.pixabay.com/download/audio/2022/02/07/audio_d17336b41f.mp3?filename=sunset-ambient-14022.mp3'
    }
  ];

  // Keep index within bounds
  if (currentTrackIndex < 0 || currentTrackIndex >= TRACKS.length) {
    currentTrackIndex = 0;
  }

  // HTML5 Audio Player Instance
  let audioPlayer = null;
  let isAudioPlaying = false;
  let fadeInterval = null;
  const TARGET_VOLUME = 0.38;

  function getAudioPlayer() {
    if (!audioPlayer) {
      audioPlayer = new Audio();
      audioPlayer.loop = true;
      audioPlayer.preload = 'auto';
      audioPlayer.volume = TARGET_VOLUME;

      audioPlayer.addEventListener('play', () => {
        isAudioPlaying = true;
        updateUI();
      });

      audioPlayer.addEventListener('pause', () => {
        isAudioPlaying = false;
        updateUI();
      });

      audioPlayer.addEventListener('error', (e) => {
        console.warn('Audio player error on current source, trying fallback:', e);
        const cur = getCurrentTrack();
        if (audioPlayer.src !== cur.fallbackSrc && cur.fallbackSrc) {
          audioPlayer.src = cur.fallbackSrc;
          if (melodyEnabled) {
            audioPlayer.play().catch(() => {});
          }
        }
      });
    }
    return audioPlayer;
  }

  function getCurrentTrack() {
    return TRACKS[currentTrackIndex] || TRACKS[0];
  }

  /**
   * Load and play the active MP3 track
   */
  function playCurrentTrack(fade = true) {
    const player = getAudioPlayer();
    const track = getCurrentTrack();

    // Check if player is already set to this track
    const expectedLocal = track.localSrc;
    const currentSrc = player.src;

    if (!currentSrc || (!currentSrc.includes(expectedLocal) && !currentSrc.includes(track.fallbackSrc))) {
      player.src = track.localSrc;
    }

    if (fade) {
      player.volume = 0.05;
      const playPromise = player.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          isAudioPlaying = true;
          updateUI();
          fadeInVolume(player, TARGET_VOLUME, 600);
        }).catch(err => {
          console.warn('Audio play request paused by browser policy or error:', err);
          // Try fallback if local source failed
          if (track.fallbackSrc && player.src !== track.fallbackSrc) {
            player.src = track.fallbackSrc;
            player.play().catch(() => {});
          }
        });
      }
    } else {
      player.volume = TARGET_VOLUME;
      player.play().then(() => {
        isAudioPlaying = true;
        updateUI();
      }).catch(() => {});
    }
  }

  function pauseMusic(fade = true) {
    if (!audioPlayer) return;

    if (fade && isAudioPlaying) {
      fadeOutVolume(audioPlayer, 350, () => {
        audioPlayer.pause();
        isAudioPlaying = false;
        updateUI();
      });
    } else {
      audioPlayer.pause();
      isAudioPlaying = false;
      updateUI();
    }
  }

  function fadeInVolume(player, target, durationMs) {
    clearInterval(fadeInterval);
    const stepMs = 40;
    const stepCount = durationMs / stepMs;
    const delta = (target - player.volume) / stepCount;

    fadeInterval = setInterval(() => {
      if (player.volume + delta >= target) {
        player.volume = target;
        clearInterval(fadeInterval);
      } else {
        player.volume = Math.min(1, player.volume + delta);
      }
    }, stepMs);
  }

  function fadeOutVolume(player, durationMs, onDone) {
    clearInterval(fadeInterval);
    const stepMs = 30;
    const stepCount = durationMs / stepMs;
    const delta = player.volume / stepCount;

    fadeInterval = setInterval(() => {
      if (player.volume - delta <= 0.02) {
        player.volume = 0;
        clearInterval(fadeInterval);
        if (typeof onDone === 'function') onDone();
      } else {
        player.volume = Math.max(0, player.volume - delta);
      }
    }, stepMs);
  }

  /**
   * Toggle music playback on/off
   */
  function toggleMelody() {
    melodyEnabled = !melodyEnabled;
    localStorage.setItem(KEY_MELODY_ENABLED, melodyEnabled);

    if (melodyEnabled) {
      playCurrentTrack(true);
    } else {
      pauseMusic(true);
    }

    updateUI();
    const track = getCurrentTrack();
    return {
      active: melodyEnabled,
      trackIndex: currentTrackIndex,
      name: track.name,
      icon: track.icon
    };
  }

  /**
   * Cycle to the next MP3 track (1 to 7)
   */
  function cycleTrack() {
    currentTrackIndex = (currentTrackIndex + 1) % TRACKS.length;
    localStorage.setItem(KEY_TRACK_INDEX, currentTrackIndex);

    const track = getCurrentTrack();
    const player = getAudioPlayer();
    player.src = track.localSrc;

    if (melodyEnabled) {
      playCurrentTrack(true);
    }

    updateUI();
    return track;
  }

  function setTrack(index) {
    if (index >= 0 && index < TRACKS.length) {
      currentTrackIndex = index;
      localStorage.setItem(KEY_TRACK_INDEX, currentTrackIndex);
      const track = getCurrentTrack();
      const player = getAudioPlayer();
      player.src = track.localSrc;
      if (melodyEnabled) {
        playCurrentTrack(true);
      }
      updateUI();
      return track;
    }
    return getCurrentTrack();
  }

  /**
   * Tactile Micro UI Sound Effects (Subtle & Clean)
   */
  let webAudioCtx = null;
  function getWebAudioContext() {
    if (!webAudioCtx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      webAudioCtx = new AudioCtx();
    }
    if (webAudioCtx && webAudioCtx.state === 'suspended') {
      webAudioCtx.resume().catch(() => {});
    }
    return webAudioCtx;
  }

  function playClick() {
    if (!soundEnabled) return;
    try {
      const ctx = getWebAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(750, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.035);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.036);
    } catch {
      // Audio context policy safe
    }
  }

  function playSuccess() {
    if (!soundEnabled) return;
    try {
      const ctx = getWebAudioContext();
      if (!ctx) return;
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
      const now = ctx.currentTime;

      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = now + (i * 0.05);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.09, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.18);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + 0.19);
      });
    } catch {}
  }

  function playDelete() {
    if (!soundEnabled) return;
    try {
      const ctx = getWebAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(380, now);
      osc.frequency.exponentialRampToValueAtTime(160, now + 0.06);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.062);
    } catch {}
  }

  function toggleSound() {
    soundEnabled = !soundEnabled;
    localStorage.setItem(KEY_SOUND_ENABLED, soundEnabled);
    if (soundEnabled) playClick();
    updateUI();
    return soundEnabled;
  }

  /**
   * Synchronize UI Controls (Equalizer, track title, buttons)
   */
  function updateUI() {
    const btnSound = document.getElementById('btnSoundToggle');
    if (btnSound) {
      btnSound.textContent = soundEnabled ? '🔊' : '🔇';
      btnSound.title = soundEnabled ? 'השתק צלילים' : 'הפעל צלילים';
    }

    const btnMelody = document.getElementById('btnMelodyToggle');
    if (btnMelody) {
      if (melodyEnabled && isAudioPlaying) {
        btnMelody.classList.add('is-playing');
        btnMelody.title = 'עצור מוזיקת רגיעה';
      } else {
        btnMelody.classList.remove('is-playing');
        btnMelody.title = 'הפעל מוזיקת רגיעה';
      }
    }

    const trackLabel = document.getElementById('melodyStyleLabel');
    if (trackLabel) {
      const track = getCurrentTrack();
      trackLabel.textContent = `${track.icon} ${track.name}`;
      trackLabel.title = `רצועה ${track.num}/7: ${track.name} (לחצו להחלפה)`;
    }
  }

  /**
   * Boot the Audio Subsystem
   */
  function init() {
    updateUI();

    const btnSound = document.getElementById('btnSoundToggle');
    if (btnSound) {
      btnSound.addEventListener('click', () => {
        const state = toggleSound();
        if (window.App) {
          App.showToast(state ? 'צלילי מקשים מופעלים 🔊' : 'צלילים הושתקו 🔇', 'info', 1400);
        }
      });
    }

    const btnMelody = document.getElementById('btnMelodyToggle');
    if (btnMelody) {
      btnMelody.addEventListener('click', () => {
        playClick();
        const res = toggleMelody();
        if (window.App) {
          if (res.active) {
            App.showToast(`מתנגן: ${res.icon} ${res.name} (רצועה ${res.trackIndex + 1}/7)`, 'success', 2600);
          } else {
            App.showToast('מוזיקת רגיעה כבויה ⏸️', 'info', 1400);
          }
        }
      });
    }

    const btnStyle = document.getElementById('btnMelodyStyle');
    if (btnStyle) {
      btnStyle.addEventListener('click', () => {
        playClick();
        const nextTrack = cycleTrack();
        if (window.App) {
          App.showToast(`עבר לרצועה: ${nextTrack.icon} ${nextTrack.name} (${nextTrack.num}/7) 🎵`, 'info', 2200);
        }
      });
    }

    // Auto-unlock audio playback on first interaction if melody was previously active
    const unlockAudio = () => {
      getWebAudioContext();
      if (melodyEnabled && !isAudioPlaying) {
        playCurrentTrack(true);
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
    cycleStyle: cycleTrack,
    cycleTrack,
    setStyle: setTrack,
    setTrack,
    getCurrentStyle: getCurrentTrack,
    getCurrentTrack,
    getStyles: () => TRACKS,
    getTracks: () => TRACKS,
    isSoundEnabled: () => soundEnabled,
    isMelodyEnabled: () => melodyEnabled,
    isPlaying: () => isAudioPlaying
  };
})();

window.SoundFX = SoundFX;

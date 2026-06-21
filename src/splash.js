// Intro splash screen ('JuJu Games'). Loaded as a classic (non-module) script so
// it always runs and stays dismissable, even from file://. Self-contained IIFE.
// Closes on click/keypress after a minimum visible time, with a short jingle.
    (() => {
      const splash = document.getElementById('splashScreen');
      if (!splash) return;

      const minVisibleMs = 5000;
      let mayClose = false;
      let closeRequested = false;
      let closed = false;
      let soundPlayed = false;

      function playSplashSound() {
        if (soundPlayed) return;
        soundPlayed = true;
        try {
          const AudioContextClass = window.AudioContext || window.webkitAudioContext;
          if (!AudioContextClass) return;
          const ctx = new AudioContextClass();
          const master = ctx.createGain();
          master.gain.setValueAtTime(0.0001, ctx.currentTime);
          master.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.04);
          master.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.18);
          master.connect(ctx.destination);

          const notes = [392, 523.25, 659.25, 783.99];
          notes.forEach((freq, index) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const start = ctx.currentTime + index * 0.11;
            osc.type = index % 2 ? 'triangle' : 'sine';
            osc.frequency.setValueAtTime(freq, start);
            gain.gain.setValueAtTime(0.0001, start);
            gain.gain.exponentialRampToValueAtTime(0.20, start + 0.025);
            gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.42);
            osc.connect(gain).connect(master);
            osc.start(start);
            osc.stop(start + 0.48);
          });

          setTimeout(() => ctx.close?.(), 1500);
        } catch (e) {}
      }

      function requestClose() {
        if (closed) return;
        closeRequested = true;
        playSplashSound();
        if (mayClose) closeSplash();
      }

      function closeSplash() {
        if (closed) return;
        closed = true;
        splash.removeEventListener('pointerdown', onPointerDown);
        window.removeEventListener('keydown', onKeyDown);
        splash.classList.add('splashOut');
        splash.style.pointerEvents = 'none';
        setTimeout(() => splash.remove(), 650);
      }

      function onPointerDown() {
        requestClose();
      }

      function onKeyDown() {
        requestClose();
      }

      splash.addEventListener('pointerdown', onPointerDown);
      window.addEventListener('keydown', onKeyDown);

      setTimeout(() => {
        mayClose = true;
        if (closeRequested) closeSplash();
      }, minVisibleMs);
    })();

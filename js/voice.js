/**
 * 陪考官语音：母语短句 + 统一音量/互斥播放
 * 移动端须在用户手势内 unlock，否则 Chrome/Safari 拦截 autoplay
 */
(function () {
  var J = (window.JIAHAO = window.JIAHAO || {});

  var VOLUME = 0.75;
  var MAX_PLAY_SEC = 3.5;
  var FADE_MS = 140;

  var audioEl = null;
  var stopTimer = null;
  var fadeTimer = null;
  var muted = false;
  var playToken = 0;
  var unlocked = false;
  var unlockPromise = null;
  var isPlaying = false;
  var lastBlockedAt = 0;

  try {
    muted = localStorage.getItem("jiahao_voice_muted") === "1";
  } catch (e) {}

  function ensureAudio() {
    if (!audioEl) {
      audioEl = new Audio();
      audioEl.preload = "auto";
      audioEl.playsInline = true;
      try {
        audioEl.setAttribute("playsinline", "true");
        audioEl.setAttribute("webkit-playsinline", "true");
      } catch (e) {}
      audioEl.volume = VOLUME;
    }
    return audioEl;
  }

  function absUrl(url) {
    if (!url) return url;
    try {
      return new URL(url, window.location.href).href;
    } catch (e) {
      return url;
    }
  }

  function clearTimers() {
    if (stopTimer) {
      clearTimeout(stopTimer);
      stopTimer = null;
    }
    if (fadeTimer) {
      clearInterval(fadeTimer);
      fadeTimer = null;
    }
  }

  function hardStop() {
    clearTimers();
    isPlaying = false;
    if (!audioEl) return;
    try {
      audioEl.pause();
      audioEl.currentTime = 0;
    } catch (e) {}
    try {
      audioEl.volume = VOLUME;
    } catch (e) {}
  }

  function fadeStop(done) {
    var a = audioEl;
    if (!a) {
      isPlaying = false;
      if (done) done();
      return;
    }
    clearTimers();
    var start = a.volume;
    var steps = 4;
    var i = 0;
    fadeTimer = setInterval(function () {
      i += 1;
      try {
        a.volume = Math.max(0, start * (1 - i / steps));
      } catch (e) {}
      if (i >= steps) {
        clearInterval(fadeTimer);
        fadeTimer = null;
        isPlaying = false;
        try {
          a.pause();
          a.currentTime = 0;
        } catch (e) {}
        try {
          a.volume = VOLUME;
        } catch (e) {}
        if (done) done();
      }
    }, Math.max(16, Math.floor(FADE_MS / steps)));
  }

  /**
   * 用户手势内解锁。正在播放正式音频时绝不 pause/改 src。
   */
  function unlock() {
    if (unlocked) return Promise.resolve(true);
    if (unlockPromise) return unlockPromise;
    if (isPlaying) {
      unlocked = true;
      return Promise.resolve(true);
    }

    var a = ensureAudio();
    var silent =
      "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=";

    unlockPromise = new Promise(function (resolve) {
      if (isPlaying) {
        unlocked = true;
        resolve(true);
        return;
      }
      try {
        a.volume = 0.001;
        a.src = silent;
      } catch (e) {}
      var p;
      try {
        p = a.play();
      } catch (e) {
        unlocked = true;
        resolve(true);
        return;
      }
      if (p && typeof p.then === "function") {
        p.then(function () {
          unlocked = true;
          if (!isPlaying) {
            try {
              a.pause();
              a.currentTime = 0;
            } catch (e) {}
          }
          try {
            a.volume = VOLUME;
          } catch (e) {}
          resolve(true);
        }).catch(function () {
          unlocked = true;
          try {
            a.volume = VOLUME;
          } catch (e) {}
          resolve(true);
        });
      } else {
        unlocked = true;
        try {
          a.volume = VOLUME;
        } catch (e) {}
        resolve(true);
      }
    });

    return unlockPromise;
  }

  function syncMuteUi() {
    document.body.classList.toggle("voice-muted", muted);
    var btn = document.getElementById("btn-voice-toggle");
    if (btn) {
      btn.setAttribute("aria-pressed", muted ? "true" : "false");
      btn.title = muted ? "已静音 · 点击开启" : "语音开 · 点击静音";
      btn.classList.toggle("is-muted", muted);
      var lab = btn.querySelector(".voice-lab");
      if (lab) lab.textContent = muted ? "静音" : "语音";
    }
    var banner = document.getElementById("voice-banner");
    if (banner) {
      banner.classList.toggle("hidden", !muted);
    }
  }

  J.VOICE = {
    VOLUME: VOLUME,
    MAX_PLAY_SEC: MAX_PLAY_SEC,
    isUnlocked: function () {
      return unlocked;
    },
    unlock: unlock,
    isMuted: function () {
      return muted;
    },
    wasRecentlyBlocked: function () {
      return Date.now() - lastBlockedAt < 8000;
    },
    setMuted: function (v) {
      muted = !!v;
      try {
        localStorage.setItem("jiahao_voice_muted", muted ? "1" : "0");
      } catch (e) {}
      if (muted) this.stop();
      else unlock();
      syncMuteUi();
    },
    toggleMute: function () {
      this.setMuted(!muted);
      return muted;
    },
    stop: function () {
      playToken += 1;
      hardStop();
    },
    /**
     * @param {string} url
     * @param {{onStart?:Function,onEnd?:Function,maxSec?:number}} hooks
     */
    play: function (url, hooks) {
      hooks = hooks || {};
      var token = ++playToken;
      if (muted || !url) {
        if (hooks.onEnd) hooks.onEnd({ reason: muted ? "muted" : "empty" });
        return;
      }

      var full = absUrl(url);
      var a = ensureAudio();
      clearTimers();

      var finished = false;
      var maxSec =
        typeof hooks.maxSec === "number" && hooks.maxSec > 0
          ? hooks.maxSec
          : MAX_PLAY_SEC;

      function done(reason) {
        if (finished || token !== playToken) return;
        finished = true;
        isPlaying = false;
        clearTimers();
        a.onended = null;
        a.onerror = null;
        if (reason === "blocked" || reason === "error") {
          lastBlockedAt = Date.now();
        }
        if (hooks.onEnd) hooks.onEnd({ reason: reason || "end" });
      }

      function armCap() {
        stopTimer = setTimeout(function () {
          if (token !== playToken || finished) return;
          fadeStop(function () {
            done("cap");
          });
        }, maxSec * 1000);
      }

      function startPlay() {
        if (token !== playToken) return;
        try {
          a.pause();
        } catch (e) {}
        a.volume = VOLUME;
        a.src = full;
        a.onended = function () {
          done("ended");
        };
        a.onerror = function () {
          done("error");
        };
        var p;
        try {
          p = a.play();
        } catch (e) {
          done("blocked");
          return;
        }
        if (p && typeof p.then === "function") {
          p.then(function () {
            if (token !== playToken) return;
            unlocked = true;
            isPlaying = true;
            if (hooks.onStart) hooks.onStart();
            armCap();
          }).catch(function () {
            // 手势内重试一次
            unlock().then(function () {
              if (token !== playToken) {
                done("blocked");
                return;
              }
              a.volume = VOLUME;
              a.src = full;
              a.play()
                .then(function () {
                  if (token !== playToken) return;
                  unlocked = true;
                  isPlaying = true;
                  if (hooks.onStart) hooks.onStart();
                  armCap();
                })
                .catch(function () {
                  done("blocked");
                });
            });
          });
        } else {
          isPlaying = true;
          if (hooks.onStart) hooks.onStart();
          armCap();
        }
      }

      // 串行：先 unlock 完成再播，禁止并行 pause
      unlock().then(function () {
        if (token !== playToken) return;
        startPlay();
      });
    },
    syncUi: syncMuteUi,
  };

  J.VOICE_LINES = {
    trump: {
      lang: "en",
      langLabel: "EN",
      idle: [
        { display: "Huge question. Believe me.", audio: "assets/audio/trump_idle_0.mp3" },
        { display: "Let's go. Tremendous.", audio: "assets/audio/trump_idle_1.mp3" },
      ],
      ok: [{ display: "Beautiful! Tremendous!", audio: "assets/audio/trump_ok_0.mp3" }],
      bad: [
        { display: "Sad. Very sad. Next!", audio: "assets/audio/trump_bad_0.mp3" },
        { display: "Wrong. So wrong. Next!", audio: "assets/audio/trump_bad_1.mp3" },
      ],
    },
    takaichi: {
      lang: "ja",
      langLabel: "JA",
      idle: [
        { display: "問題をよく読んでください。", audio: "assets/audio/takaichi_idle_0.mp3" },
        { display: "落ち着いて考えましょう。", audio: "assets/audio/takaichi_idle_1.mp3" },
      ],
      ok: [{ display: "正確です。よくできました。", audio: "assets/audio/takaichi_ok_0.mp3" }],
      bad: [
        { display: "違います。見直しを。", audio: "assets/audio/takaichi_bad_0.mp3" },
        { display: "残念です。次へ。", audio: "assets/audio/takaichi_bad_1.mp3" },
      ],
    },
    modi: {
      lang: "en-IN",
      langLabel: "EN-IN",
      idle: [{ display: "Clarity first. Think carefully.", audio: "assets/audio/modi_idle_0.mp3" }],
      ok: [{ display: "Very good. Discipline wins.", audio: "assets/audio/modi_ok_0.mp3" }],
      bad: [{ display: "Reflect, then move forward.", audio: "assets/audio/modi_bad_0.mp3" }],
    },
    macron: {
      lang: "fr",
      langLabel: "FR",
      idle: [{ display: "Soyez précis. La rigueur d'abord.", audio: "assets/audio/macron_idle_0.mp3" }],
      ok: [{ display: "Exact. C'est élégant.", audio: "assets/audio/macron_ok_0.mp3" }],
      bad: [{ display: "Pas assez précis. Regardez.", audio: "assets/audio/macron_bad_0.mp3" }],
    },
  };

  J.pickVoiceLine = function (companionId, kind) {
    var pack = J.VOICE_LINES && J.VOICE_LINES[companionId];
    if (!pack) return null;
    var arr = pack[kind] || pack.idle;
    if (!arr || !arr.length) return null;
    var line = arr[Math.floor(Math.random() * arr.length)];
    return {
      display: line.display || line.text,
      audio: line.audio,
      langLabel: pack.langLabel || "",
      lang: pack.lang || "",
    };
  };

  // DOM 就绪后同步静音 UI
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", syncMuteUi);
  } else {
    setTimeout(syncMuteUi, 0);
  }
})();

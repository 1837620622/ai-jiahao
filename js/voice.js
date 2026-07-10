/**
 * 陪考官语音：母语短句 + 统一音量/互斥播放
 * 特朗普 EN · 高市早苗 JA · 莫迪 EN-IN · 马克龙 FR
 * 音频为 edge-tts 合成，非真人录音
 *
 * 移动端注意：须先在用户手势里 unlock，否则 Chrome/Safari 会拦截 autoplay
 */
(function () {
  var J = (window.JIAHAO = window.JIAHAO || {});

  var VOLUME = 0.72;
  var MAX_PLAY_SEC = 3.5;
  var FADE_MS = 160;

  var audioEl = null;
  var stopTimer = null;
  var fadeTimer = null;
  var muted = false;
  var playToken = 0;
  var unlocked = false;

  try {
    muted = localStorage.getItem("jiahao_voice_muted") === "1";
  } catch (e) {}

  function ensureAudio() {
    if (!audioEl) {
      audioEl = new Audio();
      audioEl.preload = "auto";
      audioEl.playsInline = true;
      audioEl.setAttribute("playsinline", "true");
      audioEl.setAttribute("webkit-playsinline", "true");
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
      if (done) done();
      return;
    }
    clearTimers();
    var start = a.volume;
    var steps = 5;
    var i = 0;
    fadeTimer = setInterval(function () {
      i += 1;
      try {
        a.volume = Math.max(0, start * (1 - i / steps));
      } catch (e) {}
      if (i >= steps) {
        clearInterval(fadeTimer);
        fadeTimer = null;
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
   * 在用户点击手势内解锁音频（静音极短播放）
   * 开考 / 点选项 / 点喇叭时调用
   */
  function unlock() {
    if (unlocked) return Promise.resolve(true);
    var a = ensureAudio();
    // 1 帧近乎无声的 wav，用于解锁 autoplay
    var silent =
      "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=";
    a.volume = 0.01;
    try {
      a.src = silent;
    } catch (e) {}
    var p = a.play();
    if (p && typeof p.then === "function") {
      return p
        .then(function () {
          unlocked = true;
          try {
            a.pause();
            a.currentTime = 0;
          } catch (e) {}
          a.volume = VOLUME;
          return true;
        })
        .catch(function () {
          a.volume = VOLUME;
          return false;
        });
    }
    unlocked = true;
    a.volume = VOLUME;
    return Promise.resolve(true);
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
    setMuted: function (v) {
      muted = !!v;
      try {
        localStorage.setItem("jiahao_voice_muted", muted ? "1" : "0");
      } catch (e) {}
      if (muted) this.stop();
      else unlock();
      document.body.classList.toggle("voice-muted", muted);
      var btn = document.getElementById("btn-voice-toggle");
      if (btn) {
        btn.setAttribute("aria-pressed", muted ? "true" : "false");
        btn.title = muted ? "已静音 · 点击开启陪考官语音" : "陪考官语音开 · 点击静音";
        btn.classList.toggle("is-muted", muted);
        var lab = btn.querySelector(".voice-lab");
        if (lab) lab.textContent = muted ? "静音" : "语音";
      }
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

      function done(reason) {
        if (finished || token !== playToken) return;
        finished = true;
        clearTimers();
        a.onended = null;
        a.onerror = null;
        if (hooks.onEnd) hooks.onEnd({ reason: reason || "end" });
      }

      var finished = false;
      var maxSec =
        typeof hooks.maxSec === "number" && hooks.maxSec > 0
          ? hooks.maxSec
          : MAX_PLAY_SEC;

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
        var p = a.play();
        if (p && typeof p.then === "function") {
          p.then(function () {
            if (token !== playToken) return;
            unlocked = true;
            if (hooks.onStart) hooks.onStart();
            stopTimer = setTimeout(function () {
              if (token !== playToken || finished) return;
              fadeStop(function () {
                done("cap");
              });
            }, maxSec * 1000);
          }).catch(function () {
            // 再试一次 unlock 后重播
            unlock().then(function (ok) {
              if (!ok || token !== playToken) {
                done("blocked");
                return;
              }
              a.volume = VOLUME;
              a.src = full;
              a.play()
                .then(function () {
                  if (token !== playToken) return;
                  if (hooks.onStart) hooks.onStart();
                  stopTimer = setTimeout(function () {
                    if (token !== playToken || finished) return;
                    fadeStop(function () {
                      done("cap");
                    });
                  }, maxSec * 1000);
                })
                .catch(function () {
                  done("blocked");
                });
            });
          });
        } else {
          if (hooks.onStart) hooks.onStart();
          stopTimer = setTimeout(function () {
            fadeStop(function () {
              done("cap");
            });
          }, maxSec * 1000);
        }
      }

      // 先解锁再播，兼容 iOS / Chrome 策略
      if (!unlocked) {
        unlock().then(function () {
          startPlay();
        });
      } else {
        startPlay();
      }
    },
  };

  J.VOICE_LINES = {
    trump: {
      lang: "en",
      langLabel: "EN",
      idle: [
        {
          text: "Huge question. Believe me.",
          display: "Huge question. Believe me.",
          audio: "assets/audio/trump_idle_0.mp3",
        },
        {
          text: "Let's go. Tremendous.",
          display: "Let's go. Tremendous.",
          audio: "assets/audio/trump_idle_1.mp3",
        },
      ],
      ok: [
        {
          text: "Beautiful! Tremendous!",
          display: "Beautiful! Tremendous!",
          audio: "assets/audio/trump_ok_0.mp3",
        },
      ],
      bad: [
        {
          text: "Sad. Very sad. Next!",
          display: "Sad. Very sad. Next!",
          audio: "assets/audio/trump_bad_0.mp3",
        },
        {
          text: "Wrong. So wrong. Next!",
          display: "Wrong. So wrong. Next!",
          audio: "assets/audio/trump_bad_1.mp3",
        },
      ],
    },
    takaichi: {
      lang: "ja",
      langLabel: "JA",
      idle: [
        {
          text: "問題をよく読んでください。",
          display: "問題をよく読んでください。",
          audio: "assets/audio/takaichi_idle_0.mp3",
        },
        {
          text: "落ち着いて考えましょう。",
          display: "落ち着いて考えましょう。",
          audio: "assets/audio/takaichi_idle_1.mp3",
        },
      ],
      ok: [
        {
          text: "正確です。よくできました。",
          display: "正確です。よくできました。",
          audio: "assets/audio/takaichi_ok_0.mp3",
        },
      ],
      bad: [
        {
          text: "違います。見直しを。",
          display: "違います。見直しを。",
          audio: "assets/audio/takaichi_bad_0.mp3",
        },
        {
          text: "残念です。次へ。",
          display: "残念です。次へ。",
          audio: "assets/audio/takaichi_bad_1.mp3",
        },
      ],
    },
    modi: {
      lang: "en-IN",
      langLabel: "EN-IN",
      idle: [
        {
          text: "Clarity first. Think carefully.",
          display: "Clarity first. Think carefully.",
          audio: "assets/audio/modi_idle_0.mp3",
        },
      ],
      ok: [
        {
          text: "Very good. Discipline wins.",
          display: "Very good. Discipline wins.",
          audio: "assets/audio/modi_ok_0.mp3",
        },
      ],
      bad: [
        {
          text: "Reflect, then move forward.",
          display: "Reflect, then move forward.",
          audio: "assets/audio/modi_bad_0.mp3",
        },
      ],
    },
    macron: {
      lang: "fr",
      langLabel: "FR",
      idle: [
        {
          text: "Soyez précis. La rigueur d'abord.",
          display: "Soyez précis. La rigueur d'abord.",
          audio: "assets/audio/macron_idle_0.mp3",
        },
      ],
      ok: [
        {
          text: "Exact. C'est élégant.",
          display: "Exact. C'est élégant.",
          audio: "assets/audio/macron_ok_0.mp3",
        },
      ],
      bad: [
        {
          text: "Pas assez précis. Regardez.",
          display: "Pas assez précis. Regardez.",
          audio: "assets/audio/macron_bad_0.mp3",
        },
      ],
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
})();

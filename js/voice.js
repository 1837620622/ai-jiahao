/**
 * 陪考官语音：母语短句 + 统一音量/互斥播放
 * 特朗普 EN · 高市早苗 JA · 莫迪 EN-IN · 马克龙 FR
 * 音频为 edge-tts 合成，非真人录音
 *
 * 时序约定（答题后）：
 * - 确认答案后自动播 ok/bad
 * - 单条最长约 3.5s（到点淡出停），避免拖慢下一题
 * - 播完后由 app 再等短缓冲再切题
 */
(function () {
  var J = (window.JIAHAO = window.JIAHAO || {});

  /** 统一音量（0–1） */
  var VOLUME = 0.68;
  /** 答题反馈语音硬上限（秒） */
  var MAX_PLAY_SEC = 3.5;
  /** 淡出时长（毫秒） */
  var FADE_MS = 180;

  var audioEl = null;
  var stopTimer = null;
  var fadeTimer = null;
  var muted = false;
  var playToken = 0;

  try {
    muted = localStorage.getItem("jiahao_voice_muted") === "1";
  } catch (e) {}

  function ensureAudio() {
    if (!audioEl) {
      audioEl = new Audio();
      audioEl.preload = "auto";
      audioEl.volume = VOLUME;
    }
    return audioEl;
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
      audioEl.removeAttribute("src");
      audioEl.load();
    } catch (e) {}
    try {
      audioEl.volume = VOLUME;
    } catch (e) {}
  }

  /** 到点前短淡出再停 */
  function fadeStop(done) {
    var a = audioEl;
    if (!a) {
      if (done) done();
      return;
    }
    clearTimers();
    var start = a.volume;
    var steps = 6;
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

  J.VOICE = {
    VOLUME: VOLUME,
    MAX_PLAY_SEC: MAX_PLAY_SEC,
    isMuted: function () {
      return muted;
    },
    setMuted: function (v) {
      muted = !!v;
      try {
        localStorage.setItem("jiahao_voice_muted", muted ? "1" : "0");
      } catch (e) {}
      if (muted) this.stop();
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
     * 播放一条短句
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
      var a = ensureAudio();
      clearTimers();
      try {
        a.pause();
      } catch (e) {}
      a.volume = VOLUME;
      a.src = url;

      var finished = false;
      var maxSec =
        typeof hooks.maxSec === "number" && hooks.maxSec > 0
          ? hooks.maxSec
          : MAX_PLAY_SEC;

      function done(reason) {
        if (finished || token !== playToken) return;
        finished = true;
        clearTimers();
        a.onended = null;
        a.onerror = null;
        if (hooks.onEnd) hooks.onEnd({ reason: reason || "end" });
      }

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
          if (hooks.onStart) hooks.onStart();
          // 硬上限：到点淡出，保证不拖慢答题节奏
          stopTimer = setTimeout(function () {
            if (token !== playToken || finished) return;
            fadeStop(function () {
              done("cap");
            });
          }, maxSec * 1000);
        }).catch(function () {
          done("blocked");
        });
      } else {
        if (hooks.onStart) hooks.onStart();
        stopTimer = setTimeout(function () {
          fadeStop(function () {
            done("cap");
          });
        }, maxSec * 1000);
      }
    },
  };

  /**
   * 台词：母语展示 + 音频
   * lang: en | ja | en-IN | fr
   */
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

  /** 取一条台词 {display, audio, langLabel, lang} */
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

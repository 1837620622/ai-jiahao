/**
 * 谁是 AI 大嘉豪？· 主流程
 * - 四段位自评，必做满分 100 + 附加彩蛋分
 * - 每次开局刷新抽题，本场不重复，跨场避开近题
 * - 每题轮换陪考官 3D 形象
 */
(function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const state = {
    view: "home",
    tierId: "player",
    pack: null, // { core, bonus, paper, tier }
    cursor: 0,
    answers: [],
    selected: null, // 单击预选，尚未提交
    revealed: false,
    phase: "core",
    autoTimer: null, // 答完语音后自动下一题
    lastTap: null, // 最近点中的选项 index
    lastTapAt: 0, // 时间戳，用于移动端二次点击确认
    revealAt: 0, // 本题确认时刻，用于最短展示
  };

  /** 静音 / 无音频 / 播失败时的自动下一题延迟 */
  const AUTO_NEXT_MUTED_MS = 750;
  /** 语音播完后，答对/答错再多等一小段再切题（读解析） */
  const POST_VOICE_OK_MS = 280;
  const POST_VOICE_BAD_MS = 400;
  /** 确认后最短停留（即使语音极短或失败） */
  const MIN_REVEAL_MS = 700;
  /** 确认后最长等待（防卡死；含语音上限） */
  const MAX_REVEAL_MS = 3800;
  /** 移动端：再点同一选项确认的有效时间窗 */
  const TAP_CONFIRM_MS = 900;

  const views = {
    home: $("#view-home"),
    setup: $("#view-setup"),
    quiz: $("#view-quiz"),
    result: $("#view-result"),
  };

  function show(name) {
    state.view = name;
    Object.entries(views).forEach(([k, el]) => {
      if (!el) return;
      el.classList.toggle("hidden", k !== name);
    });
    // 测评态隐藏营销顶栏，避免双 sticky 遮挡
    document.body.classList.toggle("is-app", name !== "home");
    window.scrollTo({ top: 0, behavior: name === "home" ? "smooth" : "auto" });
  }

  function tier() {
    return JIAHAO.TIERS.find((t) => t.id === state.tierId) || JIAHAO.TIERS[1];
  }

  /** 每题固定轮换：第 n 题 → 第 n % 4 位陪考官 */
  function companionForIndex(i) {
    const list = JIAHAO.COMPANIONS;
    return list[i % list.length];
  }

  /** 台词：优先母语音频包，否则回退旧 QUOTES 文本 */
  function pickLine(c, kind) {
    if (JIAHAO.pickVoiceLine) {
      const line = JIAHAO.pickVoiceLine(c.id, kind);
      if (line) return line;
    }
    const bag = (JIAHAO.QUOTES && JIAHAO.QUOTES[c.id]) || (JIAHAO.QUOTES && JIAHAO.QUOTES.jiahao);
    let text = "……";
    if (bag && !Array.isArray(bag) && bag[kind]) {
      const arr = bag[kind];
      text = arr[Math.floor(Math.random() * arr.length)];
    } else if (Array.isArray(bag)) {
      text = bag[Math.floor(Math.random() * bag.length)];
    }
    return { display: text, audio: null, langLabel: "" };
  }

  /**
   * 更新台词并可选播放
   * @param {object} c 陪考官
   * @param {"idle"|"ok"|"bad"} kind
   * @param {Element[]} displayEls
   * @param {{play?:boolean,onEnd?:Function}} opts play 默认 true
   */
  function speakCompanion(c, kind, displayEls, opts) {
    const options =
      typeof opts === "function" ? { play: true, onEnd: opts } : opts || {};
    const shouldPlay = options.play !== false;
    const onEnd = options.onEnd;
    const line = pickLine(c, kind);
    (displayEls || []).forEach((el) => {
      if (el) el.textContent = line.display;
    });
    const langEl = $("#coach-lang");
    if (langEl) {
      langEl.textContent = line.langLabel || "";
      langEl.classList.toggle("hidden", !line.langLabel);
    }
    const note = $(".coach-voice-note");
    if (note) {
      const muted = JIAHAO.VOICE && JIAHAO.VOICE.isMuted();
      note.textContent = muted
        ? "已静音 · 点顶栏「语音」开启"
        : kind === "idle"
          ? "母语短句 · 答完后自动播"
          : "正在播报 · 播完自动下一题";
    }
    if (shouldPlay && JIAHAO.VOICE && line.audio) {
      JIAHAO.VOICE.play(line.audio, {
        onStart: () => {
          document.body.classList.add("is-speaking");
          const stage = $("#coach-stage");
          if (stage) stage.classList.add("is-speaking");
        },
        onEnd: (info) => {
          document.body.classList.remove("is-speaking");
          const stage = $("#coach-stage");
          if (stage) stage.classList.remove("is-speaking");
          if (onEnd) onEnd(info);
        },
      });
    } else if (onEnd) {
      onEnd({ reason: "skip" });
    }
    return line;
  }

  /** 首页 .reveal 入场：先标 is-in 再开 anim，避免闪白 */
  function initReveal() {
    const nodes = $$(".reveal");
    if (!nodes.length) return;

    const forceIn = () => {
      nodes.forEach((el) => el.classList.add("is-in"));
    };
    const markVisible = () => {
      nodes.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight * 0.98 && r.bottom > 0) {
          el.classList.add("is-in");
        }
      });
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      forceIn();
      return;
    }
    if (!("IntersectionObserver" in window)) {
      forceIn();
      return;
    }

    // 先把首屏标为已显示，再开动画类，杜绝「先隐后显」闪白
    markVisible();
    document.documentElement.classList.add("anim");

    const failSafe = setTimeout(forceIn, 2500);
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("is-in");
            io.unobserve(en.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    nodes.forEach((el) => {
      if (!el.classList.contains("is-in")) io.observe(el);
    });
    window.addEventListener(
      "load",
      () => {
        markVisible();
        clearTimeout(failSafe);
        // 仍未进场的块继续观察；2.5s 后 forceIn 兜底
        setTimeout(forceIn, 2000);
      },
      { once: true }
    );
  }

  function renderCompanions() {
    const box = $("#companion-grid");
    if (!box || !JIAHAO.COMPANIONS) return;
    box.innerHTML = JIAHAO.COMPANIONS.map(
      (c) => `
      <article class="companion-card">
        <div class="avatar"><img src="${c.img}" alt="${c.title}" loading="eager" /></div>
        <div class="meta">
          <strong>${c.title}</strong>
          <span>${c.role}</span>
        </div>
      </article>`
    ).join("");

    const intro = $("#coach-intro-list");
    if (intro) {
      intro.innerHTML = JIAHAO.COMPANIONS.map(
        (c) => `
        <div class="coach-intro-item">
          <img src="${c.img}" alt="${c.title}" />
          <div>
            <strong>${c.title}</strong>
            <em>${c.role}</em>
            <p>${c.duty || ""}</p>
          </div>
        </div>`
      ).join("");
    }

    // 首页 hero 气泡保留 HTML 策划文案，不覆盖为品牌口号
  }

  function renderSetup() {
    const tierBox = $("#tier-grid");
    if (!tierBox) return;
    tierBox.innerHTML = JIAHAO.TIERS.map((t) => {
      const active = t.id === state.tierId ? "active" : "";
      const coreMax = t.coreCount * t.corePoints;
      const bonusMax = t.bonusCount * t.bonusPoints;
      return `
        <button type="button" class="tier-card ${active}" data-tier="${t.id}">
          <span class="badge" style="background:${t.soft};color:${t.color}">${t.badge}</span>
          <strong>${t.name}</strong>
          <div class="title">${t.title} · ${t.subtitle}</div>
          <p>${t.desc}</p>
          <div class="tier-score-meta">
            <span>必做 ${t.coreCount} 题 × ${t.corePoints} 分 = ${coreMax}</span>
            <span>附加 ${t.bonusCount} 题 × ${t.bonusPoints} 分（最多 +${bonusMax}）</span>
            <span>过线：必做 ≥ ${t.passCore} 分 · ${t.minutes || ""}</span>
          </div>
        </button>`;
    }).join("");

    const t = tier();
    const coreMax = t.coreCount * t.corePoints;
    const bonusMax = t.bonusCount * t.bonusPoints;
    $("#setup-summary").innerHTML =
      `当前段位：<b>${t.name}</b> ／ 必做 <b>${t.coreCount} 题满分 ${coreMax}</b> ／ 附加 <b>${t.bonusCount} 题最多 +${bonusMax}</b> ／ 过线 <b>${t.passCore}</b>`;

    // 题库规模提示
    const pool = t.pool || "junior";
    const n = JIAHAO.QUESTIONS.filter((q) => q.tier === pool && !q.bonus).length;
    const tip = $("#pool-tip");
    if (tip) {
      tip.textContent = `本段位核心题池约 ${n} 道，每次开局随机刷新，本场不重复，并尽量避开你最近做过的题。`;
    }
  }

  function bindSetup() {
    $("#tier-grid").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-tier]");
      if (!btn) return;
      state.tierId = btn.dataset.tier;
      renderSetup();
    });
    $("#btn-start-quiz").addEventListener("click", startQuiz);
    const clearBtn = $("#btn-clear-used");
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        JIAHAO.clearUsed();
        alert("已清空「近期做过的题」记录。下次开局将重新从全库抽取。");
      });
    }
  }

  function clearAutoTimer() {
    if (state.autoTimer) {
      clearTimeout(state.autoTimer);
      state.autoTimer = null;
    }
  }

  function unlockVoice() {
    if (JIAHAO.VOICE && JIAHAO.VOICE.unlock) {
      try {
        JIAHAO.VOICE.unlock();
      } catch (_) {}
    }
  }

  function startQuiz() {
    clearAutoTimer();
    // 用户点击开考 → 立刻解锁音频（移动端必须）
    unlockVoice();
    // 每次开局重新 buildPaper → 刷新题库抽取 + 选项乱序
    state.pack = JIAHAO.buildPaper(state.tierId);
    if (!state.pack.paper.length) {
      alert("题库为空，稍后再试。");
      return;
    }
    state.cursor = 0;
    state.answers = [];
    state.selected = null;
    state.revealed = false;
    state.phase = "core";
    show("quiz");
    renderQuiz();
  }

  function currentQ() {
    return state.pack.paper[state.cursor];
  }

  function renderQuiz() {
    const q = currentQ();
    const paper = state.pack.paper;
    const t = state.pack.tier;
    const total = paper.length;
    const idx = state.cursor + 1;
    const c = companionForIndex(state.cursor);

    // 阶段条
    const phaseEl = $("#quiz-phase");
    if (phaseEl) {
      phaseEl.textContent = q.isBonus
        ? `附加题 · 答对 +${q.points} 分（嘉豪彩蛋）`
        : `必做题 · 每题 ${q.points} 分 · 满分 100`;
      phaseEl.classList.toggle("is-bonus", !!q.isBonus);
    }

    $("#quiz-progress-label").textContent = `${idx} / ${total}`;
    $("#quiz-tier-label").textContent = `${t.name} · ${t.title}`;
    const pct0 = Math.round((state.cursor / total) * 100);
    $("#progress-bar").style.width = `${pct0}%`;
    const pwrap = $("#progress-wrap");
    if (pwrap) pwrap.setAttribute("aria-valuenow", String(pct0));

    // 左侧陪考官：固定布局 + 母语播放
    const stage = $("#coach-stage");
    if (stage) {
      const iconSvg =
        (JIAHAO.ICONS && JIAHAO.ICONS[c.icon]) ||
        (JIAHAO.ICONS && JIAHAO.ICONS.precision) ||
        "";
      const muted = JIAHAO.VOICE && JIAHAO.VOICE.isMuted();
      stage.innerHTML = `
        <div class="coach-stage-card anim-pop">
          <div class="coach-stage-top">
            <span class="coach-lang" id="coach-lang"></span>
            <button type="button" class="btn-speak" id="btn-speak" title="播放本关台词" aria-label="播放陪考官语音">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M11 5L6 9H3v6h3l5 4V5z"/><path d="M15.5 8.5a5 5 0 010 7"/><path d="M18 6a8 8 0 010 12"/></svg>
            </button>
          </div>
          <div class="coach-avatar-wrap">
            <img src="${c.img}" alt="${c.title}" id="coach-stage-img" />
            <span class="speak-ring" aria-hidden="true"></span>
          </div>
          <div class="coach-stage-meta">
            <span class="vibe"><span class="vibe-ico">${iconSvg}</span>${c.vibe || "陪考中"}</span>
            <strong>本关陪考官</strong>
            <b>${c.title}</b>
            <p>${c.duty || c.role}</p>
          </div>
          <div class="coach-bubble" id="coach-stage-bubble">…</div>
          <p class="coach-voice-note">母语短句 · AI 合成 · ${muted ? "已静音" : "可播放"}</p>
        </div>`;
      const speakBtn = $("#btn-speak");
      if (speakBtn) {
        speakBtn.addEventListener("click", () => {
          unlockVoice();
          speakCompanion(c, "idle", [$("#coach-stage-bubble"), $("#coach-quote")], {
            play: true,
          });
        });
      }
    }

    $("#q-topic").textContent = (q.isBonus ? "附加 · " : "") + (q.topic || "综合");
    $("#q-text").textContent = q.q;

    const keys = ["A", "B", "C", "D"];
    const opts = $("#options");
    opts.innerHTML = q.options
      .map(
        (text, i) => `
      <button type="button" class="option" data-i="${i}">
        <span class="key">${keys[i] || i + 1}</span>
        <span>${text}</span>
      </button>`
      )
      .join("");

    clearAutoTimer();
    state.selected = null;
    state.revealed = false;
    state.lastTap = null;
    state.lastTapAt = 0;
    state.revealAt = 0;

    $("#explain").classList.add("hidden");
    $("#explain").innerHTML = "";
    const hint = $("#answer-hint");
    if (hint) {
      hint.classList.remove("hidden");
      hint.textContent =
        "点选选项 · 再点同一选项确认（手机友好）· 或点右下「确认」· 判分后可再点跳过语音进下一题";
    }
    $("#btn-next").disabled = true;
    $("#btn-next").textContent =
      idx === total ? "确认并结算" : "确认并下一题";

    // 底部小条 + 入场只更新 idle 文案，不自动播
    $("#coach-avatar").src = c.img;
    const nameEl = $("#coach-name");
    if (nameEl) nameEl.textContent = `本场轮值：${c.title}`;
    if (JIAHAO.VOICE) JIAHAO.VOICE.stop();
    speakCompanion(c, "idle", [$("#coach-stage-bubble"), $("#coach-quote")], {
      play: false,
    });

    updateLiveScore();

    // 选项交互：预选 / 二次确认 / 判分后点任意选项 → 下一题
    $$(".option", opts).forEach((btn) => {
      const i = Number(btn.dataset.i);
      const handleTap = (e) => {
        e.preventDefault();
        e.stopPropagation();
        unlockVoice();

        // 已判分：点选项 = 跳过语音立刻下一题（手机关键）
        if (state.revealed) {
          goNext();
          return;
        }

        const now = Date.now();
        const sameAgain =
          state.selected === i &&
          state.lastTap === i &&
          now - state.lastTapAt < TAP_CONFIRM_MS;

        if (sameAgain || (state.selected === i && state.lastTap === i)) {
          // 第二次点同一选项 → 确认
          confirmAnswer(i, true);
          return;
        }

        onSelect(i);
        state.lastTap = i;
        state.lastTapAt = now;
      };

      // click 覆盖鼠标 + 多数移动浏览器
      btn.addEventListener("click", handleTap);
      // 部分 Android 双击需要 pointerup 更灵敏（不重复确认：用 data 防抖）
      btn.addEventListener(
        "pointerup",
        (e) => {
          if (e.pointerType === "touch") {
            // 交给 click 统一处理，避免双触发；仅解锁音频
            unlockVoice();
          }
        },
        { passive: true }
      );
    });

    // 进入附加区提示
    if (q.isBonus && state.cursor === state.pack.core.length) {
      const gate = $("#bonus-banner");
      if (gate) {
        gate.classList.remove("hidden");
        gate.textContent = `必做结束！下面 ${t.bonusCount} 道附加题，答对每题 +${t.bonusPoints} 分，冲击更高嘉豪人格～`;
      }
    } else {
      const gate = $("#bonus-banner");
      if (gate) gate.classList.add("hidden");
    }
  }

  function updateLiveScore() {
    const el = $("#live-score");
    if (!el || !state.pack) return;
    const t = state.pack.tier;
    const sc = JIAHAO.scorePaper(t, state.answers, state.pack.paper);
    el.innerHTML = `必做 <b>${sc.coreScore}</b>/${sc.coreMax} · 附加 <b>+${sc.bonusScore}</b> · 合计 <b>${sc.totalScore}</b>`;
  }

  /** 单击：仅预选，不高亮判分 */
  function onSelect(choice) {
    if (state.revealed) return;
    unlockVoice();
    state.selected = choice;
    const root = $("#options");
    $$(".option", root || document).forEach((btn) => {
      const i = Number(btn.dataset.i);
      btn.classList.toggle("selected", i === choice);
    });
    $("#btn-next").disabled = false;
    const total = state.pack.paper.length;
    const idx = state.cursor + 1;
    $("#btn-next").textContent =
      idx === total ? "确认并结算" : "确认并下一题";
    const hint = $("#answer-hint");
    if (hint) {
      hint.textContent = `已选 ${"ABCD"[choice]} · 再点一次该选项确认，或点右下按钮`;
    }
  }

  /**
   * 确认作答并展示对错
   * 每次答完强制自动播陪考官 ok/bad；autoNext 时等语音结束再切题
   * @param {number|null} choice 指定选项；null 则用预选
   * @param {boolean} autoNext 是否在语音/最短展示后自动下一题
   */
  function confirmAnswer(choice, autoNext) {
    if (state.revealed) {
      if (autoNext) scheduleAutoNextAfter(POST_VOICE_OK_MS);
      return;
    }
    const pick = choice != null ? choice : state.selected;
    if (pick == null) return;

    const q = currentQ();
    const correct = pick === q.answer;
    state.revealed = true;
    state.selected = pick;
    state.revealAt = Date.now();
    state.answers[state.cursor] = { choice: pick, correct };
    const c = companionForIndex(state.cursor);

    const root = $("#options");
    // 不用 disabled（会吞掉点击）；改用 locked，判分后仍可点进下一题
    $$(".option", root || document).forEach((btn) => {
      const i = Number(btn.dataset.i);
      btn.classList.add("locked");
      btn.setAttribute("aria-disabled", "true");
      btn.classList.remove("selected");
      if (i === q.answer) btn.classList.add("correct");
      if (i === pick) {
        btn.classList.add("selected");
        if (!correct) btn.classList.add("wrong");
      }
    });

    const stamp = $("#react-stamp");
    if (stamp) {
      stamp.textContent = correct ? "嘉豪！" : "再练！";
      stamp.className = "react-stamp show " + (correct ? "ok" : "bad");
      setTimeout(() => stamp.classList.remove("show"), 900);
    }

    const box = $("#explain");
    box.classList.remove("hidden");
    const pts = q.points;
    box.innerHTML = correct
      ? `<b>命中！+${pts} 分。</b> ${q.explain || ""}`
      : `<b>歪了。</b> 正解 ${"ABCD"[q.answer]}，本题 0 分。<br/>${q.explain || ""}`;

    const hint = $("#answer-hint");
    if (hint) {
      const muted = JIAHAO.VOICE && JIAHAO.VOICE.isMuted();
      if (autoNext) {
        hint.textContent = muted
          ? "已确认 · 即将进入下一题…"
          : "已确认 · 点评中，播完自动下一题（可点选项或右下按钮立即跳过）";
      } else {
        hint.textContent = "已确认 · 点「下一题」继续";
      }
    }

    $("#btn-next").disabled = false;
    const total = state.pack.paper.length;
    const idx = state.cursor + 1;
    $("#btn-next").textContent =
      idx === total ? "查看嘉豪人格" : "下一题 →";
    const pct1 = Math.round(((state.cursor + 1) / total) * 100);
    $("#progress-bar").style.width = `${pct1}%`;
    const pwrap = $("#progress-wrap");
    if (pwrap) pwrap.setAttribute("aria-valuenow", String(pct1));

    const nameEl = $("#coach-name");
    if (nameEl) nameEl.textContent = `${c.title} · ${correct ? "认可了" : "扶额中"}`;

    updateLiveScore();

    // ── 答完必播：ok / bad（在用户手势内解锁后播放） ──
    unlockVoice();
    const postGap = correct ? POST_VOICE_OK_MS : POST_VOICE_BAD_MS;
    const isMuted = JIAHAO.VOICE && JIAHAO.VOICE.isMuted();

    if (autoNext) {
      scheduleAutoNextAfter(MAX_REVEAL_MS, true);
    }

    speakCompanion(
      c,
      correct ? "ok" : "bad",
      [$("#coach-stage-bubble"), $("#coach-quote")],
      {
        play: true,
        onEnd: (info) => {
          if (!autoNext) return;
          // 被拦截 / 静音 / 失败 → 用静音节奏尽快切题
          const blocked =
            isMuted ||
            (info && (info.reason === "blocked" || info.reason === "error"));
          scheduleAutoNextAfter(blocked ? AUTO_NEXT_MUTED_MS : postGap);
        },
      }
    );
  }

  /**
   * 在 delayMs 后切下一题，并保证确认后至少展示 MIN_REVEAL_MS
   * @param {number} delayMs 从「现在」起的额外等待
   * @param {boolean} hard 是否无视最短展示（仅用于 MAX 兜底）
   */
  function scheduleAutoNextAfter(delayMs, hard) {
    clearAutoTimer();
    const extra = typeof delayMs === "number" ? delayMs : POST_VOICE_OK_MS;
    let wait = extra;
    if (!hard && state.revealAt) {
      const elapsed = Date.now() - state.revealAt;
      const needMin = Math.max(0, MIN_REVEAL_MS - elapsed);
      wait = Math.max(extra, needMin);
    }
    state.autoTimer = setTimeout(() => {
      state.autoTimer = null;
      goNext();
    }, wait);
  }

  function goNext() {
    clearAutoTimer();
    if (JIAHAO.VOICE) JIAHAO.VOICE.stop();
    if (!state.revealed) return;
    if (state.cursor >= state.pack.paper.length - 1) {
      finish();
      return;
    }
    state.cursor += 1;
    state.selected = null;
    state.revealed = false;
    renderQuiz();
  }

  /** 下一题按钮：未确认则先确认；已确认则立刻下一题（打断语音） */
  function nextQuestion() {
    unlockVoice();
    if (!state.revealed) {
      if (state.selected == null) return;
      confirmAnswer(state.selected, true);
      return;
    }
    goNext();
  }

  function finish() {
    const t = state.pack.tier;
    const paper = state.pack.paper;
    const sc = JIAHAO.scorePaper(t, state.answers, paper);
    // 人格主要看必做卷百分比，附加分提升稀有度
    const ctx = {
      pct: sc.corePct,
      totalScore: sc.totalScore,
      totalMax: sc.totalMax,
      bonusScore: sc.bonusScore,
      count: paper.length,
      coreCount: t.coreCount,
      tierId: t.id,
      passed: sc.passed,
    };
    const { persona, badges } = JIAHAO.resolvePersona(ctx);

    show("result");

    $("#persona-img").src = persona.img;
    $("#persona-img").alt = `${persona.name}（${persona.visual || persona.name}）`;
    $("#persona-rarity").textContent = persona.rarity;
    $("#persona-name").textContent = persona.name;
    $("#persona-name").style.color = persona.color;
    $("#persona-en").textContent = persona.en;
    // 文案开头点明形象，保证和生成图强绑定
    const visualLine = persona.visual
      ? `【形象】${persona.visual}。`
      : "";
    $("#persona-blurb").textContent = visualLine + persona.blurb;
    $("#persona-traits").innerHTML = persona.traits.map((x) => `<span>${x}</span>`).join("");
    const tip = $("#persona-visual-tip");
    if (tip) {
      tip.textContent = persona.visual
        ? `专属皮肤：${persona.visual} · 与「${persona.name}」绑定，不是随机图`
        : "专属皮肤与称号绑定";
    }

    $("#score-pct").textContent = `${sc.corePct}%`;
    $("#score-correct").textContent = `${sc.coreScore}/${sc.coreMax}`;
    $("#score-tier").textContent = t.name;

    // 扩展分数卡
    const extra = $("#score-extra");
    if (extra) {
      extra.innerHTML = `
        <div class="score-box"><b>${sc.bonusScore}</b><span>附加彩蛋分 / ${sc.bonusMax}</span></div>
        <div class="score-box"><b>${sc.totalScore}</b><span>合计 / ${sc.totalMax}</span></div>
        <div class="score-box"><b>${sc.passed ? "过线" : "未过线"}</b><span>必做线 ${sc.passCore}</span></div>`;
    }

    $("#persona-advice").innerHTML = `<b>嘉豪寄语：</b>${persona.advice}`;

    const badgeBox = $("#persona-badges");
    if (badges.length) {
      badgeBox.classList.remove("hidden");
      badgeBox.innerHTML = badges.map((b) => `<span class="b" title="${b.desc}">${b.name}</span>`).join("");
    } else {
      badgeBox.classList.add("hidden");
      badgeBox.innerHTML = "";
    }

    const wrongs = [];
    paper.forEach((q, i) => {
      const a = state.answers[i];
      if (a && !a.correct) wrongs.push({ q, a });
    });
    const wl = $("#wrong-list");
    if (!wrongs.length) {
      wl.innerHTML = `<h4>错题复盘</h4><div class="wrong-item"><b>本场零失误。</b> 你可以去更高段位继续装（认真的）。</div>`;
    } else {
      wl.innerHTML =
        `<h4>错题复盘（${wrongs.length}）—— 地图不是墓碑</h4>` +
        wrongs
          .slice(0, 15)
          .map(
            ({ q, a }) => `<div class="wrong-item">
            <b>${q.isBonus ? "附加" : "必做"} · ${q.topic}</b><br/>${q.q}<br/>
            你的选择：${"ABCD"[a.choice] || "—"} ／ 正解：${"ABCD"[q.answer]}<br/>${q.explain || ""}
          </div>`
          )
          .join("");
    }

    state.lastShare = `我在「谁是 AI 大嘉豪？」自评【${t.name}】，必做 ${sc.coreScore}/${sc.coreMax}（${sc.corePct}%）${sc.passed ? "过线" : "未过线"}，附加 +${sc.bonusScore}，合计 ${sc.totalScore}。人格：【${persona.name}】。你也来测！`;
  }

  async function shareResult() {
    const text = state.lastShare || "谁是 AI 大嘉豪？";
    try {
      if (navigator.share) {
        await navigator.share({ title: "谁是 AI 大嘉豪？", text });
        return;
      }
    } catch (_) {}
    try {
      await navigator.clipboard.writeText(text);
      alert("结果已复制，去群里装（分享）一下。");
    } catch {
      prompt("复制分享：", text);
    }
  }

  function scrollToId(id) {
    show("home");
    setTimeout(() => {
      const t = document.getElementById(id);
      if (t) t.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }

  function bindGlobal() {
    $$("[data-go]").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        const go = el.dataset.go;
        if (go === "setup") {
          if (state.view === "quiz" && state.pack) {
            if (!confirm("离开本场测试？当前进度不会保存。")) return;
          }
          clearAutoTimer();
          renderSetup();
          show("setup");
        } else if (go === "home") {
          if (state.view === "quiz" && state.pack) {
            if (!confirm("返回首页？当前进度不会保存。")) return;
          }
          clearAutoTimer();
          show("home");
          const hash = el.getAttribute("href") || "";
          if (hash.startsWith("#") && hash.length > 1) {
            setTimeout(() => {
              const t = document.querySelector(hash);
              if (t) t.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 80);
          }
        } else if (go === "features") {
          scrollToId("features");
        } else if (go === "retry") {
          clearAutoTimer();
          renderSetup();
          show("setup");
        } else if (go === "retry-same") {
          startQuiz();
        }
      });
    });

    // 顶栏锚点：能力 / 陪考官 / 怎么测
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener("click", (e) => {
        const id = (a.getAttribute("href") || "").slice(1);
        if (!id) return;
        const target = document.getElementById(id);
        if (!target) return;
        e.preventDefault();
        // 若不在首页，先切回首页再滚
        if (state.view !== "home") {
          clearAutoTimer();
          show("home");
          setTimeout(() => {
            target.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 100);
        } else {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    });

    $("#btn-next").addEventListener("click", nextQuestion);
    $("#btn-share").addEventListener("click", shareResult);
    $("#btn-abort").addEventListener("click", () => {
      if (confirm("退出本场？进度不保存，但已抽过的题会记入「近期题库」以免下次撞车。")) {
        clearAutoTimer();
        if (JIAHAO.VOICE) JIAHAO.VOICE.stop();
        show("home");
      }
    });
    const vbtn = $("#btn-voice-toggle");
    if (vbtn && JIAHAO.VOICE) {
      JIAHAO.VOICE.setMuted(JIAHAO.VOICE.isMuted());
      vbtn.addEventListener("click", () => {
        const nowMuted = JIAHAO.VOICE.toggleMute();
        // 取消静音时给一次反馈
        if (!nowMuted) {
          unlockVoice();
        }
      });
    }
    // 任意首次点击也尝试解锁（覆盖「直接进页」场景）
    document.addEventListener(
      "pointerdown",
      () => unlockVoice(),
      { once: true, passive: true }
    );
  }

  function init() {
    renderCompanions();
    renderSetup();
    bindSetup();
    bindGlobal();
    initReveal();
    show("home");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();

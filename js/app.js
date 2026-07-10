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
    revealed: false,
    phase: "core", // core | bonus-gate | bonus | done
  };

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
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function tier() {
    return JIAHAO.TIERS.find((t) => t.id === state.tierId) || JIAHAO.TIERS[1];
  }

  /** 每题固定轮换：第 n 题 → 第 n % 4 位陪考官 */
  function companionForIndex(i) {
    const list = JIAHAO.COMPANIONS;
    return list[i % list.length];
  }

  function pickQuote(c, kind) {
    const bag = (JIAHAO.QUOTES && JIAHAO.QUOTES[c.id]) || JIAHAO.QUOTES.jiahao;
    if (bag && !Array.isArray(bag) && bag[kind]) {
      const arr = bag[kind];
      return arr[Math.floor(Math.random() * arr.length)];
    }
    if (Array.isArray(bag)) return bag[Math.floor(Math.random() * bag.length)];
    const arr = bag.idle || ["……"];
    return arr[Math.floor(Math.random() * arr.length)];
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

    const bubble = $("#hero-bubble");
    if (bubble && JIAHAO.BRAND) bubble.textContent = JIAHAO.BRAND.bubble;
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

  function startQuiz() {
    // 每次开局重新 buildPaper → 刷新题库抽取
    state.pack = JIAHAO.buildPaper(state.tierId);
    if (!state.pack.paper.length) {
      alert("题库为空，稍后再试。");
      return;
    }
    state.cursor = 0;
    state.answers = [];
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
    $("#progress-bar").style.width = `${((state.cursor) / total) * 100}%`;

    // 大图陪考官舞台
    const stage = $("#coach-stage");
    if (stage) {
      stage.innerHTML = `
        <div class="coach-stage-card anim-pop">
          <img src="${c.img}" alt="${c.title}" />
          <div class="coach-stage-meta">
            <span class="vibe">${c.emoji || ""} ${c.vibe || "陪考中"}</span>
            <strong>本关陪考官</strong>
            <b>${c.title}</b>
            <p>${c.duty || c.role}</p>
          </div>
          <div class="coach-bubble" id="coach-stage-bubble">${pickQuote(c, "idle")}</div>
        </div>`;
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

    $("#explain").classList.add("hidden");
    $("#explain").innerHTML = "";
    $("#btn-next").disabled = true;
    $("#btn-next").textContent =
      idx === total ? "结算嘉豪人格 🎉" : q.isBonus ? "下一道附加 →" : "下一题 →";

    // 底部小条同步
    $("#coach-avatar").src = c.img;
    const nameEl = $("#coach-name");
    if (nameEl) nameEl.textContent = `本场轮值：${c.title}`;
    $("#coach-quote").textContent = pickQuote(c, "idle");

    // 实时分预览
    updateLiveScore();

    $$(".option", opts).forEach((btn) => {
      btn.addEventListener("click", () => onPick(Number(btn.dataset.i)));
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

  function onPick(choice) {
    if (state.revealed) return;
    const q = currentQ();
    const correct = choice === q.answer;
    state.revealed = true;
    state.answers[state.cursor] = { choice, correct };
    const c = companionForIndex(state.cursor);

    $$(".option").forEach((btn) => {
      const i = Number(btn.dataset.i);
      btn.disabled = true;
      if (i === q.answer) btn.classList.add("correct");
      if (i === choice) {
        btn.classList.add("selected");
        if (!correct) btn.classList.add("wrong");
      }
    });

    // 搞怪戳记
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

    $("#btn-next").disabled = false;
    $("#progress-bar").style.width = `${((state.cursor + 1) / state.pack.paper.length) * 100}%`;

    const quote = pickQuote(c, correct ? "ok" : "bad");
    $("#coach-quote").textContent = quote;
    const bub = $("#coach-stage-bubble");
    if (bub) bub.textContent = quote;
    const nameEl = $("#coach-name");
    if (nameEl) nameEl.textContent = `${c.title} · ${correct ? "认可了" : "扶额中"}`;

    updateLiveScore();
  }

  function nextQuestion() {
    if (!state.revealed) return;
    if (state.cursor >= state.pack.paper.length - 1) {
      finish();
      return;
    }
    state.cursor += 1;
    state.revealed = false;
    renderQuiz();
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

  function bindGlobal() {
    $$("[data-go]").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        const go = el.dataset.go;
        if (go === "setup") {
          renderSetup();
          show("setup");
        } else if (go === "home") show("home");
        else if (go === "features") {
          show("home");
          setTimeout(() => {
            const t = document.getElementById("features");
            if (t) t.scrollIntoView({ behavior: "smooth" });
          }, 50);
        } else if (go === "retry") {
          renderSetup();
          show("setup");
        } else if (go === "retry-same") {
          startQuiz(); // 重新 buildPaper，题库刷新
        }
      });
    });
    $("#btn-next").addEventListener("click", nextQuestion);
    $("#btn-share").addEventListener("click", shareResult);
    $("#btn-abort").addEventListener("click", () => {
      if (confirm("退出本场？进度不保存，但已抽过的题会记入「近期题库」以免下次撞车。")) show("home");
    });
  }

  function init() {
    renderCompanions();
    renderSetup();
    bindSetup();
    bindGlobal();
    show("home");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();

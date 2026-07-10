/**
 * 嘉豪人格 · 称号必须与专属形象一一对应
 * 图在 assets/p_*.jpg，文案按画面人设写，避免「图文两张皮」
 */
var JIAHAO = (window.JIAHAO = window.JIAHAO || {});

/**
 * 匹配顺序：从高分/特殊 → 兜底
 * ctx: { pct, bonusScore, passed, tierId, totalScore }
 */
JIAHAO.PERSONAS = [
  {
    id: "yuzhou",
    name: "宇宙大嘉豪",
    en: "COSMIC JIAHAO",
    rarity: "传说 · 披风已升空",
    img: "assets/p_yuzhou.jpg",
    color: "#6B3FA0",
    // 图：披风星图、光环、史诗英雄 pose
    blurb:
      "看这身星图披风——你不是隔壁班打碟，你是直接出舱了。必做卷几乎焊死，附加彩蛋也吃得满。全场最高规格皮肤：宇宙大嘉豪，仅限真懂的人穿。",
    traits: ["星图披风款", "天选理解者", "幻觉绝缘体"],
    advice: "去带人、写标准、做基建。宇宙级皮肤，请勿只用来发朋友圈。",
    visual: "星图披风 + 光环英雄",
    match: (ctx) => ctx.pct >= 95 && (ctx.bonusScore || 0) >= 6,
  },
  {
    id: "dajiahao",
    name: "大嘉豪",
    en: "GRAND JIAHAO",
    rarity: "史诗 · 皇冠到账",
    img: "assets/p_dajiahao.jpg",
    color: "#C45C26",
    // 图：黑外套、皇冠悬浮、叉腰得意
    blurb:
      "悬浮皇冠已就位，叉腰冷笑已加载。这就是标准「大嘉豪」皮肤：不是塑料货，是分数实打实把皇冠焊在头顶。朋友圈可以官宣了。",
    traits: ["悬浮皇冠", "叉腰认证", "含金量在线"],
    advice: "皇冠戴稳。下一步啃权限、成本、评测——别只会炫。",
    visual: "皇冠 + 酷盖叉腰",
    match: (ctx) => ctx.pct >= 90,
  },
  {
    id: "yinghe",
    name: "硬核嘉豪",
    en: "HARDCORE JIAHAO",
    rarity: "史诗 · 眼镜反光款",
    img: "assets/p_yinghe.jpg",
    color: "#1F6FEB",
    // 图：黑帽衫、眼镜反光代码、RGB 键盘感
    blurb:
      "眼镜片里全是代码反光，帽衫一拉就是终端。你不是教室一体机打碟的中二，你是键帽冒烟的硬核嘉豪——高分段的工程体。",
    traits: ["代码反光眼镜", "帽衫工程师", "能跑才是真的"],
    advice: "把「能跑」升级成可观测、可回滚。硬核的尽头是稳。",
    visual: "帽衫 + 代码眼镜",
    match: (ctx) =>
      ctx.pct >= 82 && (ctx.tierId === "pro" || ctx.tierId === "god" || ctx.tierId === "player"),
  },
  {
    id: "jiagou",
    name: "架构嘉豪",
    en: "ARCHITECT JIAHAO",
    rarity: "稀有 · 全息脑图款",
    img: "assets/p_jiagou.jpg",
    color: "#5B2C8B",
    // 图：西装、全息神经网络
    blurb:
      "西装笔挺，身侧悬着一张全息脑图——典型架构嘉豪出场方式。别人在蒙题，你在脑内画路由、权限和熔断。大神局过线，就是这个皮肤。",
    traits: ["全息架构图", "西装战略家", "风险雷达"],
    advice: "一页图讲清数据流与失败路径。最怕没有终止条件。",
    visual: "西装 + 全息网络",
    match: (ctx) => ctx.pct >= 78 && ctx.tierId === "god",
  },
  {
    id: "wen",
    name: "稳嘉豪",
    en: "STEADY JIAHAO",
    rarity: "稀有 · 清单绅士款",
    img: "assets/p_wen.jpg",
    color: "#2F6F4E",
    // 图：polo、清单全息、可靠微笑
    blurb:
      "Polo 衫、温柔笑、旁边还浮着一张核对清单——这就是稳嘉豪。不浪、不玄学、必做过线。团队最爱把你拉进群的那种。",
    traits: ["清单控", "polo 可靠脸", "过线专业户"],
    advice: "补齐 RAG / Agent / 评测，从稳嘉豪进化到硬核/架构。",
    visual: "polo + 清单全息",
    match: (ctx) => ctx.passed || ctx.pct >= 70,
  },
  {
    id: "xiaojiahao",
    name: "小嘉豪",
    en: "MINI JIAHAO",
    rarity: "普通 · 卫衣火花款",
    img: "assets/p_xiaojiahao.jpg",
    color: "#E091A5",
    // 图：幼态、大号卫衣、星星点点
    blurb:
      "大号卫衣差点把人吞进去，头顶小火花还在冒——标准小嘉豪。已经不是纯路人，但皇冠和披风都还早。萌，但在长大。",
    traits: ["大号卫衣", "成长火花", "可塑性 MAX"],
    advice: "真实小任务连做 14 天。小嘉豪会窜个儿，火花会变成闪电。",
    visual: "幼态 + 大卫衣 + 火花",
    match: (ctx) => ctx.pct >= 55,
  },
  {
    id: "shixi",
    name: "实习嘉豪",
    en: "INTERN JIAHAO",
    rarity: "普通 · 双肩包报道款",
    img: "assets/p_shixi.jpg",
    color: "#3D8BDB",
    // 图：背包、笔记本、热切眼神
    blurb:
      "双肩包还没放下，笔记本已经打开——实习嘉豪本豪。概念听过半套，眼神很有戏，上场腿有点软。欢迎入职嘉豪宇宙试用期。",
    traits: ["双肩包", "试用期热血", "需要带教"],
    advice: "Token / 幻觉 / 提示 / 安全，先讲给舍友听。讲得清才算出师。",
    visual: "背包 + 笔记本实习生",
    match: (ctx) => ctx.pct >= 42,
  },
  {
    id: "moyu",
    name: "摸鱼嘉豪",
    en: "SLACK JIAHAO",
    rarity: "趣味 · 咖啡半梦款",
    img: "assets/p_moyu.jpg",
    color: "#8B7355",
    // 图：半梦半醒、咖啡杯、合上的本子
    blurb:
      "眼皮打架，咖啡续命，本子合上——这不叫用力过猛，这叫摸鱼嘉豪。收藏夹 999，终端打开次数约等于点外卖。分数在敲你的桌子。",
    traits: ["半梦咖啡脸", "舒适区住户", "潜力冬眠中"],
    advice: "关掉 20 个教程页，今天只做一个能跑的最小 Demo。咖啡可以续，卷也得续。",
    visual: "犯困 + 咖啡 + 合上笔记本",
    match: (ctx) => ctx.pct >= 30,
  },
  {
    id: "huanjue",
    name: "幻觉嘉豪",
    en: "HALLUCINATION JIAHAO",
    rarity: "趣味 · 气泡错觉款",
    img: "assets/p_huanjue.jpg",
    color: "#9B59B6",
    // 图：梦幻气泡、自信又迷糊
    blurb:
      "头顶一堆彩色气泡在开会，表情还挺自信——幻觉嘉豪本尊。说得特别对，仔细一想……气泡里装的是什么？你和模型双向奔赴了。",
    traits: ["彩色思维泡泡", "自信拉满", "核验待充电"],
    advice: "新规矩：每个结论带来源或反例。把气泡变成脚注。",
    visual: "梦幻气泡环绕",
    match: (ctx) => ctx.pct >= 15,
  },
  {
    id: "jia",
    name: "塑料大嘉豪",
    en: "FAKE JIAHAO",
    rarity: "趣味 · 闪光奖牌款",
    img: "assets/p_jia.jpg",
    color: "#C0392B",
    // 图：夸张奖牌、彩带、得意过头
    blurb:
      "大金牌闪到反光，彩带乱飞，表情管理是「我超强」——但分数说：这是塑料大嘉豪。奖牌可以先赊账，剧本支持重拍镀金。",
    traits: ["闪光塑料牌", "得意过头", "反转空间巨大"],
    advice: "新手上路起号，错题复述解析。下周把塑料炼成合金。",
    visual: "夸张金牌 + 彩带装逼",
    match: () => true,
  },
];

JIAHAO.BADGES = [
  {
    id: "fujia-wang",
    name: "附加题猎手",
    desc: "彩蛋分吃得凶，和宇宙披风更配。",
    match: (ctx) => (ctx.bonusScore || 0) >= 12,
  },
  {
    id: "guoxian",
    name: "段位过线",
    desc: "必做跨过线，稳嘉豪门槛件。",
    match: (ctx) => ctx.passed,
  },
  {
    id: "gaoduan",
    name: "敢点高段",
    desc: "高手/大神局入场，和硬核/架构皮更贴。",
    match: (ctx) => ctx.tierId === "god" || ctx.tierId === "pro",
  },
  {
    id: "manfen",
    name: "无瑕疵输出",
    desc: "必做接近满分，皇冠/披风二选一。",
    match: (ctx) => ctx.pct >= 98,
  },
  {
    id: "chonglai",
    name: "重开镀金",
    desc: "塑料牌专属精神：删档重来也是勇气。",
    match: (ctx) => ctx.pct < 40,
  },
];

JIAHAO.resolvePersona = function (ctx) {
  for (const p of JIAHAO.PERSONAS) {
    if (p.match(ctx)) {
      return {
        persona: p,
        badges: JIAHAO.BADGES.filter((b) => b.match(ctx)),
      };
    }
  }
  const last = JIAHAO.PERSONAS[JIAHAO.PERSONAS.length - 1];
  return { persona: last, badges: [] };
};

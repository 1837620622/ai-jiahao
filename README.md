# 谁是 AI 大嘉豪？

硬核 **AI 能力测评** + **嘉豪人格签发**。  
自评段位 → 作答判分 → 陪考官母语点评 → 一键生成人格报告。

[![在线体验](https://img.shields.io/badge/在线体验-ai--jiahao-c45c26?style=for-the-badge)](https://ai-jiahao-aa3.pages.dev/)
[![Cloudflare Pages](https://img.shields.io/badge/Cloudflare-Pages-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://ai-jiahao-aa3.pages.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](./LICENSE)

---

## 在线地址

| 入口 | 链接 |
|------|------|
| **正式站（推荐）** | **https://ai-jiahao-aa3.pages.dev/** |
| GitHub 仓库 | https://github.com/1837620622/ai-jiahao |

打开浏览器即可使用：纯前端、无需登录、本地判分。

---

## 项目简介

「嘉豪」来自网络梗：用力过猛、显眼包，也有「真诚搞事业」的那一面。  
本站把这股劲接到 AI 学习上——用一套正经测评，测清楚你到底懂不懂。

适合：

- 个人自测 AI 基础 / 工程概念  
- 朋友圈、群里整活分享人格结果  
- 课程导入、团队团建热身  
- 面试前快速过一遍 LLM / RAG / Agent 常识  

---

## 功能一览

- **四段位自选**：新手上路 · 进阶玩家 · 高手过招 · 大神登顶  
- **清晰计分**：必做卷满分 100；附加题为彩蛋加分  
- **大题库**：1300+ 题（专业 + 整活），每次开考随机刷新  
- **选项乱序**：每题选项 Fisher–Yates 打乱，避免「永远选 B」  
- **本场不重复**：同场题目 ID 唯一  
- **跨场防撞题**：`localStorage` 记录近题，尽量不重复  
- **即时判分 + 解析**  
- **四位陪考官轮值**：答题页每题换一位形象（气氛组，不改分）  
- **母语短句语音**：答完自动播 ok / bad（EN / JA / EN-IN / FR），可静音  
- **10 种嘉豪人格**：称号与专属形象一一绑定  
- **结果可分享**  

---

## 答题交互

| 操作 | 行为 |
|------|------|
| 单击选项 | 预选（高亮） |
| 再点同一选项 | 确认作答（手机友好） |
| 桌面双击 | 确认作答 |
| 点「确认并下一题」 | 确认并进入语音点评流程 |
| 答完 | **陪考官自动播母语点评** → 播完短暂停顿 → 自动下一题 |
| 顶栏「语音 / 静音」 | 开关陪考官语音（记住偏好） |
| 侧栏喇叭按钮 | 手动重播本关 idle 台词 |

### 语音与下一题时序

1. 确认答案后立刻播放对/错短句（约 3s 内，超时淡出）  
2. 播完后再等约 0.3–0.5s（便于扫一眼解析）  
3. 确认后最短展示约 0.85s；最长约 4.2s 兜底，防止卡死  
4. 静音时跳过音频，约 0.9s 后进入下一题  
5. 手动点「下一题」会立刻打断当前语音  

音频为 **edge-tts AI 合成**，非真人录音；音量统一约 0.68。

---

## 段位与计分

| 段位 | 必做 | 计分 | 附加 | 过线（只看必做） |
|------|------|------|------|------------------|
| 新手上路 | 20 题 | ×5 = **100** | 5×2（最多 +10） | ≥ 60 |
| 进阶玩家 | 25 题 | ×4 = **100** | 8×1（最多 +8） | ≥ 70 |
| 高手过招 | 25 题 | ×4 = **100** | 10×2（最多 +20） | ≥ 75 |
| 大神登顶 | 25 题 | ×4 = **100** | 10×2（最多 +20） | ≥ 80 |

规则说明：

1. **必做卷**决定是否过线，并作为人格主判定依据（按必做正确率）。  
2. **附加卷**答对加分、答错不扣必做分；拉开稀有人格与徽章。  
3. **每次「开始测试 / 再测一次」都会重新抽题**。  

---

## 嘉豪人格（称号 ↔ 形象）

| 人格 | 形象特征 | 大致门槛（必做正确率） |
|------|----------|------------------------|
| 宇宙大嘉豪 | 星图披风 | ≥95% 且附加分较高 |
| 大嘉豪 | 悬浮皇冠 | ≥90% |
| 硬核嘉豪 | 帽衫 + 代码眼镜 | ≥82%（中高段） |
| 架构嘉豪 | 西装 + 全息图 | ≥78% 且大神局 |
| 稳嘉豪 | Polo + 清单 | 过线 / ≥70% |
| 小嘉豪 | 大卫衣 + 火花 | ≥55% |
| 实习嘉豪 | 双肩包 | ≥42% |
| 摸鱼嘉豪 | 咖啡犯困 | ≥30% |
| 幻觉嘉豪 | 思维气泡 | ≥15% |
| 塑料大嘉豪 | 夸张奖牌 | 兜底 |

结果页会标明：形象与称号绑定，不是随机抽图。

---

## 陪考官与母语

答题时左侧大图轮值（角色定位，不展示国籍标签）：

| 同学 | 定位 | 语音 |
|------|------|------|
| 特朗普同学 | 气势位 · 气氛组 | English |
| 高市早苗同学 | 严谨位 · 审题纠察 | 日本語 |
| 莫迪同学 | 定力位 · 稳住节奏 | English (IN) |
| 马克龙同学 | 表达位 · 逻辑质检 | Français |

音频文件位于 `assets/audio/`（如 `trump_ok_0.mp3`、`takaichi_bad_1.mp3`）。

---

## 题库与防重复

- 题池按初级 / 中级 / 高级组织，段位映射到对应池  
- 覆盖：LLM、Token、提示工程、RAG、Agent、评测、安全、推理工程等  
- `questions-extra.js` 追加专业 + 幽默题  
- `buildPaper(tierId)`：洗牌 + 无放回抽取 + **选项乱序**  
- 本场 `id` 去重  
- `localStorage` 键：`jiahao_used_v1`（设置页可「清空近题记录」）  
- 语音静音偏好：`jiahao_voice_muted`  

---

## 本地运行

```bash
git clone https://github.com/1837620622/ai-jiahao.git
cd ai-jiahao
python3 -m http.server 8787
# 浏览器打开 http://127.0.0.1:8787
```

或：

```bash
npm run dev
# 等同 python3 -m http.server 8787
```

**无需构建、无后端、无安装业务依赖。**  
注意：请用本地 HTTP 打开（不要直接 `file://`），否则部分浏览器会拦截音频。

---

## 目录结构

```text
ai-jiahao/
├── index.html              # 官网首页 + 测评流程
├── css/styles.css          # 样式（Claude 气质产品 UI）
├── js/
│   ├── questions.js        # 题库 · 段位 · 抽题 · 计分
│   ├── questions-extra.js  # 追加专业 / 幽默题
│   ├── personas.js         # 人格称号与形象
│   ├── voice.js            # 陪考官母语台词与播放
│   └── app.js              # 页面流程 · 双击/再点确认 · 语音时序
├── assets/
│   ├── *.jpg               # 陪考官 / 人格图
│   └── audio/*.mp3         # 母语短句（edge-tts）
├── wrangler.toml           # Cloudflare Pages（project: ai-jiahao）
├── package.json
├── LICENSE
└── README.md
```

---

## 部署（Cloudflare Pages）

```bash
# 需已执行：npx wrangler login
npm run deploy
# 或：
npx wrangler pages deploy . --project-name=ai-jiahao --commit-dirty=true
```

当前生产域名：

```text
https://ai-jiahao-aa3.pages.dev/
```

自定义域名（如 `ai-jiahao.chuankangkk.top`）请在 Cloudflare Dashboard → Pages → `ai-jiahao` → Custom domains 中添加，并确保根域名 DNS 在同一账号下。

---

## 技术说明

| 项 | 说明 |
|----|------|
| 形态 | 静态 SPA（HTML / CSS / JS） |
| 判分 | 浏览器本地（娱乐向，非保密认证考试） |
| 语音 | edge-tts 合成短句 + 统一音量 / 硬上限 |
| 存储 | 近题记录、语音静音偏好使用 `localStorage` |
| 兼容 | 现代桌面 / 移动浏览器 |

> 题目与解析用于学习娱乐，请勿作为企业认证或招聘唯一依据。  
> 陪考官形象与语音为娱乐气氛组，不代表任何政治立场。

---

## 许可证

[MIT License](./LICENSE)

欢迎 Star、Fork，或改成你们班的「谁是大嘉豪」。

---

## 链接

- 在线站：https://ai-jiahao-aa3.pages.dev/  
- GitHub：https://github.com/1837620622/ai-jiahao  
- 作者：[@1837620622](https://github.com/1837620622)  

**AI 嘉豪测试，冲！**

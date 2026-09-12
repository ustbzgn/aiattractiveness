# Working rules
Read PROJECT.md TASKS.md HANDOFF.md. Work in this project only; agentory is read-only reference. Never inspect or echo credentials. Keep .env.local ignored. No shared database mutation outside this project's isolated namespace. No db:push. No production deploy or push without task scope.
Use explicit small task inputs; do not recursively load the entire skills collection. User screenshots are visual authority. Read relevant installed Next.js documentation before framework changes. Report checks honestly; do not equate written code with passed acceptance.

# UI & Brand Design Rules
1. **严禁使用带有强烈“AI味”的科技感/魔棒/火花图标 (Banned AI Icons)**:
   - 全局任何组件（包括提示横幅、卡片、徽章、弹窗、Logo等）**绝对严禁**引入或渲染带有强烈“AI感/魔法/机器人”的图标。
   - **黑名单图标列表（严禁 import 与使用）**：
     - `Sparkles`（火花/星星/魔法，绝对严禁）
     - `Bot` / `BotMessageSquare`（机器人）
     - `Wand` / `Wand2`（魔棒/变美魔法）
     - `Cpu` / `CircuitBoard`（芯片/电路）
     - `Zap` / `Bolt`（闪电/超能力）
     - `Brain`（大脑/神经网）
     - `Flame`（爆款火焰）
   - **严禁出现的示例代码**：
     ```tsx
     // ❌ 严禁出现以下任意写法：
     <Sparkles size={20} />
     <Wand2 className="..." />
     <Bot size={18} />
     ```
   - **合规替代方案**：统一使用人像摄影与人文自然质感的写实元素，例如 `Camera`（相机）、`ScanFace`（人像取景）、`ImagePlus`（添加相片）、`Award`（评审/质感）、`CheckCircle2`（完成确认）或纯文字高质感 Badge（如 `border border-[#f5d0d8] bg-[#fdf2f4]` 胶囊标签）。
   - 左上角 Logo 区域后期统一替换为真实的女性肖像头像（Woman Portrait Avatar）或优雅的人文摄影肖像，当前以纯文字品牌标呈现并预留头像卡槽。
2. **语言与文案**: 严禁生硬、模板化且充满“AI味”的机械文案。文案需偏向专业人像摄影、光影美学、日常着装及自然面部构图建议（人文自然质感），避免充斥“AI Algorithm / Magic Scan / Robotic Score”等套话。
3. **严禁暴露技术细节与底层服务商**: 严禁在面向消费者的前端界面暴露任何底层服务商名称、技术实现细节或防御性免责说辞（严禁出现 "Merchant Gateway", "Waffo", "RSA-256", "Webhook", "Cryptographic signature", "Zero subscription guaranteed", "One-Time Credit Packs", "Pay only for what you analyze", "Instant credit fulfillment" 等给程序员或监管看的说明）。
4. **拒绝无意义的营销堆砌与空洞模板**: 定价与功能介绍文案必须自然、极简、高质感，严禁空洞生硬的 AI 营销套话（如 "Perfect for profile upgrades and exploring multiple expressions & poses"）。页面布局需保持呼吸感与优雅留白，严禁拥挤堆叠信息。

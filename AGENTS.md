1. 每次提的功能需求，尽量修改最少的相关代码
2. 页面不能有星形的AI图标（减少AI感），页面不能有重复的信息（如已经在卡片顶部显示了年付节约多少钱了，就不用在卡片详情中还显示一遍）
3. 当写完代码要告诉我总结的时候，称呼我为桂宁主人
4. 本项目部署在云服务器的 Docker Compose 环境中。


# UI & Brand Design Rules

5. 避免不必要的次要标签、说明文字、辅助文案、描述性文字和冗余的微文案。
让布局、视觉层级、间距和清晰的主操作自己完成解释。具体要求： 优先用强视觉层级和自解释的结构，而不是用文字去解释。默认不要添加 slogan 式文字、教学段落，或在每个区块下都加“帮助说明”。如果确实需要补充信息，优先使用 info 图标 + tooltip，而不是始终显示的次要文字。

6. 保留必要的表单标签和可访问名称（方便读屏软件）。界面清爽不能牺牲可访问性。危险或不可逆操作（删除、支付、提交永久性变更）必须保留清晰的后果提示。去掉说明文字后，第一次使用的人仍应能看懂：下一步点哪里、点了会发生什么。重写已有界面时：先去掉冗余标签和说明，如果清晰度下降，再优化布局和按钮文案。

7.  **严禁使用带有强烈“AI味”的科技感/魔棒/火花图标 (Banned AI Icons)**:
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
8. **语言与文案**: 严禁生硬、模板化且充满“AI味”的机械文案。文案需偏向专业人像摄影、光影美学、日常着装及自然面部构图建议（人文自然质感），避免充斥“AI Algorithm / Magic Scan / Robotic Score”等套话。
9. **严禁暴露技术细节与底层服务商**: 严禁在面向消费者的前端界面暴露任何底层服务商名称、技术实现细节或防御性免责说辞（严禁出现 "Merchant Gateway", "Waffo", "RSA-256", "Webhook", "Cryptographic signature", "Zero subscription guaranteed", "One-Time Credit Packs", "Pay only for what you analyze", "Instant credit fulfillment" 等给程序员或监管看的说明）。
10. **拒绝无意义的营销堆砌与空洞模板**: 定价与功能介绍文案必须自然、极简、高质感，严禁空洞生硬的 AI 营销套话（如 "Perfect for profile upgrades and exploring multiple expressions & poses"）。页面布局需保持呼吸感与优雅留白，严禁拥挤堆叠信息。

# Multi-App Modularity & AI Context Isolation Rules

11. **模块隔离与低上下文污染规范**:
   - 本项目为 **ColorAI** 门户（PostgreSQL 独立 Schema：`colorai_portal`），包含公共底座 `src/core/` 与独立应用区 `src/features/<app>/`（如 `attractiveness`、`color-analysis`）。
   - **开发或修改某个具体应用时，仅读取 `src/core/README.md` 与对应的 `src/features/<app>/` 目录，禁止读取或修改其他 `src/features/*` 应用的代码**，以减少上下文污染。
   - 依赖方向严格单向：`src/features/<app>` → `src/core`；严禁 `features` 之间互相引用，严禁 `core` 引用 `features`。




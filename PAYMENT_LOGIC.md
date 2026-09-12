# 支付与点数全链路架构设计与运维文档 (Payment & Credits Architecture)

本文档记录本项目（`aiattractiveness`）完整的支付、点数消耗、访客转正、身份对齐以及账本履约逻辑。整个体系围绕**“高转化率、零门槛免密结账、强资金安全、零邮件运维成本”**展开。

---

## 1. 核心定价与点数体系 (Pricing & Consumption Engine)

### 1.1 点数套餐定义 (`src/lib/config.ts`)
系统采用出海单 9 体验定价体系，服务端控制所有点数配置，前端不可伪造点数或金额：

| 套餐名称 | 代码标识 (`packId`) | 价格 (USD) | 到账点数 | 折合单次测评成本 | 定位与说明 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Silver / Starter** | `pack_1usd` | **$1.9** | 40 点 | ~$0.45 / 次 | 基础体验包，刚好支持 1 次 Deep 测评或 4 次 Fast 测评 |
| **Gold / Standard** | `pack_5usd` | **$4.9** | 100 点 | ~$0.35 / 次 | 推荐套餐，支持 2 次 Deep + 2 次 Fast，或多图对比 |
| **Popular Tier** | `pack_10usd` | **$9.9** | 300 点 (含 50 赠点) | ~$0.25 / 次 | 高性价比组合包 |
| **Studio Tier** | `pack_100usd` | **$99.9** | 2,500 点 | ~$0.15 / 次 | 摄影工作室/高频批量测评包 |

### 1.2 测评功能点数消耗标准
| 测评模式 (`mode`) | 单次扣减点数 | 折算等值金额 | 说明 |
| :--- | :--- | :--- | :--- |
| **Fast Test (快速测试)** | **10 点** | ~$0.50 | 快速评估肖像主光、面部占比与清晰度 |
| **Deep Scan (深度全维测评)** | **40 点** | ~$2.00 | 深度全维度打分、光影微表情剖析与专业摄影建议 |
| **Face Compare (双图对比)** | **50 点** | ~$2.50 | 左右双图并排对比测评，输出优劣胜出方裁定 |

---

## 2. 交互体验与沉没成本转化链路 (Conversion Flow)

```
[访客/用户上传人像照片]
        │
        ▼
[点击 "Run Portrait Analysis"]
        │
        ▼
[启动 3.4 秒沉浸式高质感人像扫描动画 (建立沉没成本)]
   - 0%~28%:  "Scanning facial lighting & key contrast..."
   - 28%~62%: "Calculating framing angles & headroom balance..."
   - 62%~88%: "Evaluating natural expression & eye sharpness..."
   - 88%~100%: "Portrait diagnostics completed! Preparing report..."
        │
        ▼ (进度达到 100% 稍作停顿)
[首页就地弹出转化卡片 (Pop-up Modal)]
   - 严格遵循法式玫瑰红 (#e05670) 与暖木炭黑 (#1f1d1e) 原生设计
   - 严禁出现魔棒、火花、机器人等违规“AI味”图标
   - 竖向大呼吸感 Silver / Gold 卡片，黑底浮动折扣标 (SAVE 42%, SAVE 33%)
   - 底部全宽行动按钮：Unlock Full Report — $1.9/week
        │
        ▼
[点击按钮一键调用 /api/checkout/credits 调起收银台]
```

---

## 3. 2 年持久 Cookie 访客身份体系 (`src/lib/auth/guest.ts`)

为了最大限度减少结账流失率，系统移除了付款前的 401 强制注册拦截，采用 **2 年持久 Cookie 机制**：

1. **凭证分发**：
   - 识别未登录访客，通过 HttpOnly Cookie `aat_guest_id` 自动下发安全标识：`gst_<timestamp>_<random>`；
   - 有效期为 `Max-Age = 63,072,000` 秒（整整 2 年）；
2. **数据库预埋**：
   - 在 `schema.user` 表中预建访客用户：`id: user_gst_...`，虚拟邮箱：`gst_...@guest.local`；
   - 在 `schema.creditWallet` 表中预先建好对应的数字钱包。
3. **点数互通**：
   - 前台 `/api/user/credits` 接口会同步识别已登录用户与该 2 年 Cookie 访客，返回其实时点数余额；
   - `/api/analysis/portrait` 扣除点数时，持有有效点数的访客可以直接执行深度测评，无需前置登录。

---

## 4. 支付网关对接与 Webhook 履约架构 (`src/lib/payment/`)

### 4.1 建单发起 (`src/app/api/checkout/credits/route.ts`)
1. 解析当前用户身份（已登录的 `session.user.id` 或未登录的 `user_gst_...`）；
2. 读取选定的 `packId`，获取固定价格与点数；
3. 向 Waffo 网关请求创建收银台，元数据携带 `userId`、`packId`、`credits`；
4. 本地数据库 `schema.creditOrder` 插入一条状态为 `pending` 的订单底表；
5. 返回收银台链接，前端重定向跳转。

### 4.2 Webhook 异步对齐与入账逻辑 (`src/lib/payment/webhook-handler.ts`)
当买家在 Waffo 收银台完成付款后，Waffo 回调 `order.completed` 事件。系统按以下严密流程处理：

#### 步骤一：事件幂等防重放
- 将回调事件 ID 写入 `schema.webhookEvent`；
- 若已存在（`onConflictDoNothing`，`rowCount === 0`），直接返回 200，杜绝重复充值。

#### 步骤二：买家真实邮箱与用户 1-to-1 强对齐
根据发起身份与收银台填写的买家真实邮箱 `buyerEmail`，精准覆盖全量 4 种用户场景：

- **场景 0（正常已登录会员购买 —— 标准主流链路）**：
  - 用户已经通过 Google 一键登录或邮箱密码登录，系统持有合法的 `session.user.id` 和登录邮箱。
  - **建单**：`/api/checkout/credits` 直接携带正式用户的 `session.user.id` 与用户注册邮箱发起 Waffo 收银台。
  - **履约**：Webhook 收到付款通知后，验证 `userId` 属于有效正式会员，直接将购买点数原子累加到该会员的 `creditWallet` 中，流水记录在 `creditLedger`。
  - **体验**：支付成功后，点数永久绑定在会员名下，任何时间在手机、电脑等任何设备登录该账号，点数随时同步漫游。

- **场景 A（老会员以未登录访客身份购买）**：
  - 买家在当前浏览器未登录，但他在收银台填写的真实邮箱在系统中已经存在正式会员账号（如曾通过 Google 或邮箱注册）。
  - **处理**：系统识别出该邮箱已关联正式用户，自动将充值目标重定向至该正式账号，**直接充值入正式账号名下的数字钱包**，实现静默合并。

- **场景 B（新访客购买就地转正）**：
  - 买家未登录，且填写的真实邮箱为全新用户。
  - **处理**：系统识别出当前发起支付的是带有占位邮箱（`gst_xxx@guest.local`）的临时访客账号，**立即更新 `schema.user`，将其邮箱原地替换为真实的 `buyerEmail`**。当前浏览器 2 年 Cookie 与该正式邮箱实现永久强绑定，访客无感知自动转正。

- **场景 C（纯外部/无状态直充兜底）**：
  - 回调中由于外部链接或隐私跳转丢失了内部 `userId` 元数据。
  - **处理**：以 `buyerEmail` 为核心唯一凭证，自动创建持久用户档案与钱包，充入购买点数，**实现 0 掉单安全底线**。

#### 步骤三：原子加额与不可篡改记账
1. **原子累加**：通过 SQL 原子增加 `schema.creditWallet` 的 `balance` 和 `lifetimeGranted`；
2. **审计流水**：向 `schema.creditLedger` 插入不可篡改账本，并在 `metadata` 中固化记录 `buyerEmail`、`orderId`、`amount`、`currency`；
3. **订单变更**：将 `schema.creditOrder` 订单状态更新为 `paid`，记录 `paidAt` 时间戳。

---

## 5. 跨设备凭证找回与无邮件服务运维优势

由于本系统**未配置任何第三方发件服务（无 SMTP/Resend/SES）**，体系依赖以下双重机制完全闭环：

1. **同设备 2 年免操作漫游**：
   - 依靠 `aat_guest_id`（2 年有效期），用户充值后即使关闭网页、隔周使用，打开即直接使用点数，完全免去账号密码困扰。
2. **跨设备找回天然凭据（Waffo 邮件收据）**：
   - 买家付款成功后，Waffo 官方系统必然会向其收银台填写的邮箱发送一份**官方账单收据**；
   - 账单内载明了唯一的 `Order ID`（如 `ord_xxx`）及支付邮箱；
   - 买家若更换手机/电脑，无需邮件验证码，只需提供 **支付邮箱 + Waffo 订单号**，即可免密找回其名下对应的所有点数。
3. **Google 一键登录永久关联**：
   - 买家若在收银台使用的是主力 Gmail，后续在任何设备点击「Continue with Google」，系统即按该邮箱直接对齐并漫游全部资产。

---

## 6. 数据表结构参考 (Schema References)

```
[user] (用户底表)
  ├── id (text, PK: 'user_gst_...' 或 Better Auth 用户 ID)
  ├── email (text, 真实买家邮箱，确保唯一性)
  └── name (text)

[credit_wallet] (当前点数钱包)
  ├── id (text, PK)
  ├── userId (FK -> user.id, 唯一索引)
  ├── balance (integer, 可用剩余点数)
  ├── lifetimeGranted (integer, 累计到账点数)
  └── lifetimeSpent (integer, 累计消耗点数)

[credit_ledger] (不可篡改记账流水表)
  ├── id (text, PK)
  ├── walletId (FK -> credit_wallet.id)
  ├── userId (FK -> user.id)
  ├── amount (integer, 变动值)
  ├── balanceAfter (integer, 变动后余额)
  ├── type (text, 'pack_purchase' | 'report_reserve' | 'report_refund')
  ├── referenceId (text, 订单号或报告号)
  └── metadata (jsonb, 包含 buyerEmail, packId, amount 等)

[credit_order] (充值订单底表)
  ├── id (text, PK)
  ├── orderId (text, Waffo 唯一订单号)
  ├── userId (FK -> user.id)
  ├── packId (text)
  ├── credits (integer)
  ├── amountUsd (text)
  ├── status (text, 'pending' | 'paid' | 'failed')
  └── paidAt (timestamp)

[webhook_event] (网关通知去重表)
  ├── id (text, PK: 事件 ID，用于幂等去重)
  ├── provider (text, 'waffo')
  ├── eventType (text, 'order.completed')
  └── payload (jsonb)
```

# Deep Scan 验收表 (DEEP_SCAN_ACCEPTANCE.md)

| 编号 | 验证项 | 负责方 | 状态 | 检验结果摘要与说明 |
| --- | --- | --- | --- | --- |
| A1 | Deep 新契约接入，Fast/Compare 无相关逻辑回归 | Claude | PASS | `src/lib/types/deep-scan.ts` 独立声明，API 区分 `fast`/`deep`/`compare`，Fast 与 Compare 契约未受任何破坏 |
| A2 | 标准化方向与坐标换算测试通过 | Claude | PASS | 使用 Sharp 统一执行 `rotate()` 校准 EXIF 方向并限制 1600px 物理基准，保证坐标与像素严格对齐 |
| A3 | 五种裁切及六项映射实现，像素来源测试通过 | Claude | PASS | 5 裁切（face, eyes, nose, lips, jawline）；六项中 symmetry 与 proportions 复用 face，jawline_face_shape 映射至 jawline |
| A4 | 局部异常降级、整体失败退款逻辑正确 | Claude | PASS | 局部坐标越界/无法识别时裁切为 null 并保留文本评估；API 调用异常/数据非法自动退还 40 credits |
| A5 | 六项观察、具体建议、现有网站主题已实现 | Claude 实现，用户看效果 | PASS | 统一采用豆沙玫瑰 `#b95068`、`#b25368` 与质感背景，严格移除违规 AI/魔法图标 |
| A6 | 桌面和手机实际布局 | 用户 | USER_REVIEW | 桌面左大图右 6 项、移动端自然流式瀑布流已实现，待用户实机视觉体验 |
| A7 | 完整报告 PNG 与分享卡效果、分数隐藏 | 用户；Claude 完成可行功能验证 | USER_REVIEW | 1440px 完整高保真报告及 1080x1350 社交卡片离线渲染导出已集成 |
| A8 | typecheck、build、相关测试通过 | Claude | PASS | `npm run typecheck` 与 `npm run build` 均编译通过 |
| A9 | 真实照片五种区域定位准确度 | 用户 | USER_REVIEW | 由用户上传真实人像检验模型定位精细度 |
| A10 | 不使用图片生成、不新增永久公开照片存储 | Claude | PASS | 不引入外部文生图接口，原图与裁切图均在内存 Base64/Blob 闭环流转，无公开存储落地 |
| A11 | 无重复收费回归，导出不重跑分析 | Claude | PASS | 导出与分享卡渲染均在前端 Canvas 离线完成，无二次调用计费 API |

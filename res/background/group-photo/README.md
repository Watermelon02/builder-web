# 合照素材与上传说明

最终资源为 `three/`、`six/` 两档分层图片，RDL、UN、GOF 共用。每层保留 PNG 编辑源和无损 WebP，共 30 张 WebP、30 张 PNG。运行时只加载当前档 WebP，不包含单位、文字或脚底圆环。文件尺寸及 SHA-256 见 `manifest.json`。

## 上传

将 `output/group-photo-release/group-photo-runtime.zip` 解压至各资源服务器的 **res/background/** 下，包内自带 `group-photo/` 前缀：

```text
res/background/group-photo/three/*.webp
res/background/group-photo/six/*.webp
```

中文沿用 `BACKGROUND_SRC.zh`（腾讯 COS），英日沿用各自 `BACKGROUND_SRC`。PNG 留作编辑源，无须上传图床。原派系图标和右下角标识继续使用现有资源，不重复打包。服务器须允许跨域 GET，返回正确的 `image/webp`，缺失文件返回 404，避免 HTML 回落；先上传资源，再发布前端。本次不自动上传。

## 版本、缓存与分层

统一配置为 `src/data/resource.ts` 的 `GROUP_PHOTO_ASSET_VERSION = '3'`，URL 使用 `?v=3`，缓存名为 `ember-img-group-photo-v3`，已进入现有缓存保留名单。成功可读取的图片按需缓存；失败、HTML 或不透明响应不缓存。任务与弹窗复用缓存；退出时释放解码位图、临时画布、动画和对象 URL。

- `floor-base`、`cove-light`、`wall-mask`：浅色地板、无网点弧面光影及着色墙面。
- `floor-curves`：完整灰色曲线；仅实际地面圆环附近使用动态遮罩，空位置没有固定缺口。
- `hand-god`、`hand-adam`、`wrist-transition`：批准的独立双手及白到灰接地段。
- `moon-orbit`、`moon-01…`：三机四月相、六机十月相和细轨道。

三机母版 2835×1518、六机母版 3351×2539，实际画布随内容及标题增高。派系墙色 RDL `#DA0246`、UN `#0D28F3`、GOF `#F2B600`；UN 正式月相及薄柔光为 `#FFD24A`，其余派系月相保持白色。UN 已恢复 10 月 21 日双手版本，叠窗专用模块及素材移至仓库外归档，不再加载。弹窗与正式合照共用月相颜色。该着色仅在运行时完成，不修改 PNG/WebP 原素材，无须重新上传资源，缓存仍为 v3。

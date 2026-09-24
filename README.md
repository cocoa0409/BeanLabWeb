# BEAN LABS

BEAN LABS PTE. LTD. 官网，英文内容，Astro 静态输出。正式域名：<https://www.kultalab.com/>。

Git 仓库：<https://github.com/cocoa0409/BeanLabWeb>，主分支为 `main`。

## 开发与验证

```sh
npm ci
npm run dev         # http://127.0.0.1:4321/
npm run build       # 同步原始资料并生成 dist/
npm run preview     # 预览生产构建
npm run check       # Astro / TypeScript
npm run test:content # 文档导入格式检查
npm run test:e2e    # 构建后运行浏览器测试（需安装 Google Chrome）
```

## 维护

- `resource/blog/`、`resource/product/`：原始文档。构建时由 `scripts/import-resources.mjs` 导入；不要直接修改生成的 `src/content/`。产品导入会恢复导出文档中的标题、表格和代码块，并将样例文档的标题层级放在所属章节之下。
- `src/data/site.ts`：产品简介、作者、固定发布日期与岗位；列表按日期倒序。
- `src/data/contact.json`：合作邮箱和招聘邮箱。
- `resource/brand/`：最终选定的银色主视觉原稿、B 图标和几何参数。
- `public/brand/`、`public/artwork/`：正式使用的图标和压缩背景图。
- `src/scripts/data-field.ts`、`brand-particles.ts`：持续背景动画和粒子聚散。
- `src/components/OnThisPage.astro`：文章、产品详情共用的目录。桌面宽 264px，标题下显示阅读进度，长目录独立滚动；移动端使用带进度条的折叠目录。
- `src/styles/`：统一米白背景、黑色文字、响应式排版。
- `public/licenses/`：本地托管字体的许可和来源说明。

首页保持一屏。银色背景和粒子共享持久 Canvas，导航时只改变阅读蒙层。粒子基础色统一为 `#333333`，Canvas 与静态回退统一去色，米色蒙层独立保留。动画支持暂停、减少动态效果及 WebGL 不可用时的静态回退。

设计候选、研究截图和旧素材已移至项目同级的 `beanlabs_website_archive/20260925-030855/`；不参与构建或发布。正式部署只上传 `dist/`，不上传源码、原始资料、依赖或测试产物。

## 部署

使用服务器现有 Docker Nginx 和 Let's Encrypt 证书，无需 Node 或 Django 服务。配置、更新和回滚方式见 [部署说明](deploy/README.md)。

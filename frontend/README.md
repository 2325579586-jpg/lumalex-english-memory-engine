# LumaLex Frontend

新的桌面端前端壳层，使用：

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui 风格组件结构

## 目录说明

- `src/components/ui`：基础设计系统组件
- `src/components/layout`：侧边栏、顶栏、应用骨架
- `src/pages`：Dashboard、Learn、Review、Add、Library、Stats、Settings
- `src/services`：mock/api 适配层
- `src/stores`：Zustand 状态管理

## 开发命令

在 `frontend/` 目录下安装依赖后执行：

```bash
npm install
npm run dev
```

## 构建命令

```bash
npm run build
```

构建成功后，Flask 会优先托管 `frontend/dist`。如果 `dist` 不存在，后端会继续回退到旧静态页。

# 灵感 APP

> 基于孙正义"随机组合法"的创意激发工具

**灵感**APP 的核心理念源自软银集团创始人孙正义的"随机组合法"——通过将三个毫不相关的事物随机组合在一起，激发全新的创意联想。孙正义在创业初期，曾用这种方法在一年内产出了超过250个商业创意，其中不乏后来改变世界的想法。

## 功能列表

| 功能模块 | 说明 |
|---------|------|
| 随机三词抽取 | 老虎机式三列卷轴动画，从词库中随机抽取三个词 |
| 5分钟灵感计时 | 倒计时结束后自动进入超时正计时模式 |
| 灵感记录与存档 | 保存灵感到数据库，支持查看、编辑、删除 |
| 自定义词库管理 | 支持创建多个词库分类，导入/编辑/删除词语 |
| 指定词随机组合 | 用户指定一个词，系统随机匹配其他词进行组合 |
| 灵感统计面板 | 显示累计灵感数、今日/本周灵感数、连续记录天数 |
| 灵感卡片分享 | 生成精美卡片截图，支持保存图片或复制文字 |
| AI 智能分析 | 接入 OpenAI / 通义千问，对灵感进行创意解读和评分 |
| 深色模式 | 支持跟随系统、浅色、深色三种外观模式 |
| 意见反馈 | 支持 Bug 报告、功能建议，QQ 跳转发送反馈 |
| 关于页面 | APP 理念介绍、开发者信息、版本信息 |

## 技术栈

- **框架**: Expo SDK 54 + React Native 0.81
- **语言**: TypeScript 5.9
- **路由**: Expo Router 6
- **样式**: NativeWind 4 (Tailwind CSS)
- **数据库**: MySQL (Drizzle ORM)
- **本地存储**: AsyncStorage + SecureStore
- **API**: tRPC
- **动画**: React Native Reanimated 4

## 本地运行

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 仅启动 Metro（前端）
pnpm dev:metro

# 仅启动 API 服务器
pnpm dev:server
```

## 打包方法

通过 Manus 平台的 **Publish** 按钮进行打包，会自动生成 Android APK 安装包。

## 项目结构

```
app/                    # 页面文件（Expo Router 文件路由）
  (tabs)/               # Tab 导航页面
    index.tsx           # 主页（随机抽词）
    archive.tsx         # 灵感库（历史列表）
    library.tsx         # 词库管理
    about.tsx           # 关于页面
  inspiration-detail.tsx # 灵感详情页
  category-detail.tsx   # 词库分类详情
  settings.tsx          # 设置页面
  feedback.tsx          # 意见反馈
  feedback-history.tsx  # 反馈历史
components/             # 可复用组件
  word-roller.tsx       # 卷轴动画组件
  screen-container.tsx  # 安全区域容器
services/               # 服务模块
  aiService.ts          # AI 分析服务
  aiConfig.ts           # AI 配置管理
  feedbackStorage.ts    # 反馈本地存储
lib/                    # 工具库
  theme-context.tsx     # 主题管理
  word-filter.ts        # 词语过滤算法
  word-library-context.tsx # 词库上下文
server/                 # 后端 API
  routes/               # tRPC 路由
drizzle/                # 数据库 Schema
assets/                 # 静态资源
  images/               # 图标和启动屏
```

## 版本

**V1.0.0**

## 开发者

**Miracles_Gratitude**

## 许可证

本项目为私有项目，保留所有权利。

# 私域销转数据看板 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个数据分离、可实时更新的私域销转数据看板，支持全量数据深度分析和穿透查看。

**Architecture:** 纯前端 SPA（HTML + CSS + Vanilla JS + ECharts），数据层通过 Node.js 脚本从飞书 Bitable API 拉取全量数据存为本地 JSON，前端读取 JSON 渲染。5个视图页面通过侧边导航切换。

**Tech Stack:** HTML5, CSS3 (CSS Variables), Vanilla JS (ES6+), ECharts 5.x (CDN), Node.js 18+ (数据拉取脚本), 飞书 Bitable API v1

---

## 文件结构

```
~/projects/sales-dashboard/
├── index.html              # 主页面骨架 + 导航 + 全局筛选器
├── css/
│   └── style.css           # 全局样式（深色主题、布局、组件）
├── js/
│   ├── app.js              # 主逻辑：数据加载、筛选状态管理、视图路由
│   ├── charts.js           # ECharts 图表渲染（所有图表的配置和更新）
│   ├── analysis.js         # 智能分析引擎（趋势判断、异常检测、文字生成）
│   └── table.js            # 数据表格组件（排序、搜索、分页）
├── data/                   # 数据文件（由 fetch-data.js 生成）
│   ├── conversion.json     # 转化数据总表
│   ├── orders.json         # 销售报单表
│   ├── weekly-ops.json     # 分区运营表
│   ├── member-contact.json # 成员联系统计
│   ├── member-service.json # 成员服务统计
│   └── meta.json           # 拉取元信息
├── fetch-data.js           # 数据拉取脚本（Node.js）
├── serve.sh                # 一键启动本地服务器
└── docs/
    └── superpowers/
        ├── specs/
        │   └── 2026-04-06-sales-dashboard-design.md
        └── plans/
            └── 2026-04-06-sales-dashboard-plan.md
```

---

## Task 1: 数据拉取脚本 (fetch-data.js)

**Files:**
- Create: `fetch-data.js`
- Create: `serve.sh`

这是整个项目的基础，先把数据拉下来，后面所有开发都基于本地 JSON。

- [ ] **Step 1: 创建 fetch-data.js 脚本框架**

脚本功能：
1. 从 `~/.openclaw/openclaw.json` 读取飞书凭证
2. 获取 tenant_access_token
3. 分页拉取5张表的全量数据（每页500条）
4. 清洗数据：提取 formula/lookup 字段的实际值
5. 写入 data/ 目录下的 JSON 文件
6. 写入 meta.json

需要处理的飞书数据格式：
- Formula 字段：`{type: 2, value: [0.03]}` → 提取 `value[0]`
- Lookup 字段：同上
- Text 字段：`[{text: "xxx", type: "text"}]` → 提取 `text`
- SingleSelect 字段：直接是字符串
- Number 字段：直接是数字
- DateTime 字段：毫秒时间戳 → 转为 ISO 日期字符串

5张表的拉取配置：

| 表名 | table_id | 预估记录数 | 需要的字段 |
|---|---|---|---|
| 转化数据总表 | tblisfypGqzVkrdK | 7,214 | 全部字段 |
| 销售报单表 | tbl74KR7ZdbdlUYP | 16,796 | 序号、创建时间、审批状态、推广员姓名、期数、SKU、例子画像、报单金额、组长、分区负责人、运营负责人、审批备注 |
| 分区运营表 | tblQtlbWck1vKW2K | 444 | 全部字段 |
| 成员联系统计 | tblOwJELNv1SvEqt | 970 | 全部字段 |
| 成员服务统计 | tbl69FKxeP6DifdX | 986 | 服务人员、部门、学员总数、今日新增、更新时间 |

- [ ] **Step 2: 运行脚本，验证数据完整性**

```bash
cd ~/projects/sales-dashboard && node fetch-data.js
```

验证：
- 每张表的记录数与飞书一致
- meta.json 包含拉取时间和各表记录数
- 抽查几条记录的字段值是否正确

- [ ] **Step 3: 创建 serve.sh**

```bash
#!/bin/bash
cd "$(dirname "$0")"
echo "看板地址: http://localhost:8891"
python3 -m http.server 8891
```

---

## Task 2: HTML 骨架 + CSS 主题 (index.html + style.css)

**Files:**
- Create: `index.html`
- Create: `css/style.css`

- [ ] **Step 1: 创建 index.html**

页面结构：
```html
- Header: 标题 + 全局筛选器（时间范围、SKU、城市、例子画像）
- 侧边导航: 概览 / 转化分析 / 团队分析 / 报单明细 / 数据明细
- 主内容区: 5个视图容器（display:none 切换）
  - #view-overview: KPI卡片行 + 图表网格 + 智能分析区
  - #view-conversion: 漏斗 + 画像对比 + 期数趋势 + 占比图
  - #view-team: 组长排名 + 分区对比 + 推广员表格 + 行为数据
  - #view-orders: 报单统计 + 状态分布 + 时间线 + 明细表
  - #view-detail: 全量数据表格 + 搜索
- Footer: 数据更新时间
```

- [ ] **Step 2: 创建 css/style.css**

深色主题变量 + 布局 + 组件样式：
- CSS Variables: 所有颜色、圆角、间距
- 布局: Header sticky, 侧边导航 fixed 200px, 主内容区自适应
- 组件: KPI卡片、图表卡片、表格、筛选器、导航项
- 响应式: 1024px 以下侧边导航收起
- 动效: 卡片 hover、导航切换、数据加载

- [ ] **Step 3: 浏览器验证骨架**

打开 http://localhost:8891，确认：
- 深色主题正确
- 导航可点击切换视图
- 筛选器可操作
- 布局在不同宽度下正常

---

## Task 3: 数据加载 + 筛选引擎 (app.js)

**Files:**
- Create: `js/app.js`

- [ ] **Step 1: 创建 app.js**

功能：
1. `loadData()`: fetch 加载5个 JSON 文件，存入全局 `window.DATA`
2. `getFilters()`: 读取当前筛选器状态（时间范围、SKU、城市、例子画像）
3. `applyFilters(data, filters)`: 对数据应用筛选，返回筛选后的数据集
4. `aggregateByMonth(data)`: 按月聚合（求和 GMV/例子数/转化数，加权平均转化率/到课率）
5. `aggregateBySku(data)`: 按 SKU 聚合
6. `aggregateByTeamLead(data)`: 按组长聚合
7. `aggregateByRegion(data)`: 按分区负责人聚合
8. `switchView(viewId)`: 切换视图，触发对应视图的渲染
9. `renderCurrentView()`: 根据当前视图和筛选条件，调用对应的渲染函数
10. 事件绑定：筛选器 change → renderCurrentView()，导航点击 → switchView()

- [ ] **Step 2: 验证数据加载和筛选**

在浏览器 console 中验证：
- `window.DATA.conversion.length` 应为 7214
- `window.DATA.orders.length` 应为 16796
- 筛选器改变后，数据正确过滤

---

## Task 4: 概览视图 — KPI + 图表 (charts.js 第一部分)

**Files:**
- Create: `js/charts.js`

- [ ] **Step 1: KPI 卡片渲染**

6个 KPI：总GMV、净GMV、总例子数、整体转化率、平均例子价值、ARPU
每个卡片：数值 + 环比变化（对比上一个月）

- [ ] **Step 2: GMV 月度趋势图**

折线图，按 SKU 分色，支持切换合计/分SKU 模式

- [ ] **Step 3: 转化率趋势图**

三条折线：总转率、直转率、追单率

- [ ] **Step 4: 到课率趋势图**

三条折线：D1、D2、D3 到课率

- [ ] **Step 5: SKU GMV 对比图**

堆叠柱状图，按月显示三个 SKU 的 GMV 构成

- [ ] **Step 6: 例子价值 & 例子数双轴图**

柱状图（例子数）+ 折线（例子价值）

- [ ] **Step 7: 退款率趋势图**

折线图，开营前退款率月度走势

- [ ] **Step 8: 浏览器验证概览视图**

所有图表正常渲染，筛选器联动正常，hover tooltip 正确

---

## Task 5: 智能分析引擎 (analysis.js)

**Files:**
- Create: `js/analysis.js`

- [ ] **Step 1: 创建分析引擎**

分析函数列表：
1. `analyzeGmvTrend(months)`: GMV 环比趋势判断
2. `analyzeConversionRate(months)`: 转化率最高/最低月份，直转vs追单占比
3. `detectAnomalies(months)`: 环比波动超30%的月份标记
4. `analyzeSkuComparison(data)`: SKU 表现对比，GMV 占比
5. `analyzeAttendance(months)`: 到课率趋势与转化率关联
6. `analyzeRefund(months)`: 退款率异常提醒
7. `generateSummary(data, filters)`: 汇总所有分析，生成 HTML

每条分析输出：类型(good/warn/bad/info) + 标签 + 文字描述

- [ ] **Step 2: 验证分析输出**

切换不同时间范围，确认分析文字合理、异常检测准确

---

## Task 6: 转化分析视图

**Files:**
- Modify: `js/charts.js` (添加转化分析相关图表)

- [ ] **Step 1: 转化漏斗图**

ECharts funnel 图：例子数 → D1到课 → D2到课 → D3到课 → 直播转化 → 追单转化

- [ ] **Step 2: 按例子画像对比图**

分组柱状图：X轴例子画像类型，Y轴转化率

- [ ] **Step 3: 按期数趋势图**

折线图：X轴期数（第1期~第107期），Y轴转化率

- [ ] **Step 4: 直播转化 vs 追单占比图**

环形图：直播转化占比 vs 追单占比

- [ ] **Step 5: 浏览器验证转化分析视图**

---

## Task 7: 团队分析视图

**Files:**
- Modify: `js/charts.js` (添加团队分析相关图表)
- Modify: `js/table.js` (添加推广员表格)

- [ ] **Step 1: 组长 GMV 排名图**

水平柱状图，按 GMV 降序排列

- [ ] **Step 2: 分区负责人对比图**

分组柱状图：对比各分区的转化率、到课率、例子价值

- [ ] **Step 3: 推广员明细表格**

可搜索、可排序表格：姓名、组、期数、例子数、转化数、转化率、GMV、ARPU

- [ ] **Step 4: 成员行为数据表格**

表格：聊天数、消息数、回复率、首次回复时长、红包数据
标记异常：回复率 < 50%、删除学员 > 5

- [ ] **Step 5: 浏览器验证团队分析视图**

---

## Task 8: 报单明细视图

**Files:**
- Modify: `js/charts.js` (添加报单相关图表)
- Modify: `js/table.js` (添加报单表格)

- [ ] **Step 1: 报单统计 KPI 卡片**

总报单数、同意数、拒绝数、待修正数、审批通过率

- [ ] **Step 2: 审批状态分布饼图**

- [ ] **Step 3: 报单时间线柱状图**

按月统计报单数量

- [ ] **Step 4: 报单明细表格**

可搜索、可排序、可按审批状态筛选

- [ ] **Step 5: 浏览器验证报单明细视图**

---

## Task 9: 数据明细视图 + 表格组件 (table.js)

**Files:**
- Create: `js/table.js`

- [ ] **Step 1: 创建通用表格组件**

功能：
- 接收数据数组 + 列配置
- 支持多列排序（点击表头）
- 支持关键词搜索（实时过滤）
- 支持分页（每页100条）
- 数字列自动格式化（百分比、金额、整数）

- [ ] **Step 2: 数据明细视图**

转化数据总表全量字段展示，使用通用表格组件

- [ ] **Step 3: 浏览器验证**

搜索、排序、分页功能正常，7000+条数据渲染流畅

---

## Task 10: 最终集成 + 验证

**Files:**
- Modify: 所有文件（最终调整）

- [ ] **Step 1: 全流程验证**

1. 运行 `node fetch-data.js` 拉取最新数据
2. 运行 `bash serve.sh` 启动服务
3. 打开 http://localhost:8891
4. 逐个视图检查：图表渲染、筛选联动、数据正确性
5. 切换不同筛选条件，确认所有图表和分析同步更新
6. 检查响应式布局（缩小窗口）

- [ ] **Step 2: 性能检查**

- 7000+条转化数据的表格渲染是否流畅
- 16000+条报单数据的表格是否需要虚拟滚动
- 图表切换是否有卡顿

- [ ] **Step 3: 修复发现的问题**

- [ ] **Step 4: 交付给用户审阅**

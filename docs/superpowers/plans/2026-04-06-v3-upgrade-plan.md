# 私域销转数据看板 V3 升级计划

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 补充所有遗漏的关键数据分析，新增深度分析视图，优化转化漏斗显示。

**Architecture:** 在现有5视图基础上，增强概览/转化分析视图的图表，新增「深度分析」视图，优化数据预处理。

---

## Task 1: 数据预处理增强 (app.js)

补充遗漏字段的标准化提取。

**Files:** Modify `js/app.js`

- [ ] Step 1: 在 conversion 预处理中补充以下字段提取：
  - 退款：_refundCount, _refundGmv, _refundRate, _directRefund
  - 分日GMV：_day2Gmv, _day3Gmv
  - 分日直转：_day2Direct, _day3Direct, _day2DirectRate, _day3DirectRate
  - 预约：_d1BookRate, _d2BookRate, _d3BookRate, _d1BookCount, _d2BookCount, _d3BookCount
  - 追单拆分：_followThis, _followThisGmv, _followThisRate, _followPrev, _followPrevGmv, _followPrevRate, _followRatio
  - 入群：_joinCount, _joinRate
  - 回访：_callbackCount, _callbackRate
  - 到课转化率：_attendConvRate
  - 30分钟到课率：_d1Rate30, _d2Rate30, _d3Rate30
  - 例子新鲜度：_freshness
  - 例子画像二级：_profile2
  - 转化周期：_convCycle
  - 直播版本：_liveVersion

- [ ] Step 2: 在 aggregateByMonth 中补充新字段的聚合逻辑

---

## Task 2: 概览视图增强 — 退款率趋势图

**Files:** Modify `js/charts.js`, Modify `index.html`

- [ ] Step 1: index.html 概览视图图表区新增退款率趋势图卡片
- [ ] Step 2: charts.js 新增 renderRefundTrend(monthlyAgg) — 双轴：退款率折线 + 退款GMV柱状图
- [ ] Step 3: app.js 概览渲染中调用新图表

---

## Task 3: 转化漏斗优化 — 加转化率百分比

**Files:** Modify `js/charts.js`

- [ ] Step 1: renderFunnel 改为显示每层的转化率百分比（相对上一层和相对总例子数）
- [ ] Step 2: label 格式改为「名称\n人数 (占比%)」

---

## Task 4: 转化分析视图增强 — 分日转化 + 追单结构 + 完整漏斗

**Files:** Modify `js/charts.js`, Modify `index.html`

- [ ] Step 1: index.html 转化分析视图新增3个图表卡片
- [ ] Step 2: renderDayCompare(monthlyAgg) — 分组柱状图：D2 vs D3 的直转数和GMV对比
- [ ] Step 3: renderFollowStructure(monthlyAgg) — 堆叠面积图：本期追单 vs 往期追单的月度趋势
- [ ] Step 4: renderFullFunnel(monthlyAgg) — 完整漏斗：例子数→预约→到课→直播转化→追单

---

## Task 5: 新增「深度分析」视图

**Files:** Modify `index.html`, Modify `js/charts.js`, Modify `js/app.js`

- [ ] Step 1: index.html 新增侧边导航项「深度分析」+ 视图容器，包含8个图表卡片
- [ ] Step 2: renderJoinRateTrend(monthlyAgg) — 入群率月度趋势折线图
- [ ] Step 3: renderCallbackAnalysis(monthlyAgg) — 回访回复率趋势 + 与转化率的散点关联图
- [ ] Step 4: renderAttendConvRate(monthlyAgg) — 到课-直播转化率趋势（衡量直播质量）
- [ ] Step 5: render30minAttend(monthlyAgg) — 30分钟到课率 vs 全程到课率对比
- [ ] Step 6: renderFreshnessCompare(rawData) — 按例子新鲜度(A/B/C)的转化率对比柱状图
- [ ] Step 7: renderProfile2Compare(rawData) — 按二级画像的转化率对比
- [ ] Step 8: renderConvCycle(rawData) — 转化周期分布直方图
- [ ] Step 9: renderLiveVersionCompare(rawData) — 按直播版本的转化率对比
- [ ] Step 10: app.js 新增 deep-analysis 视图的渲染调度

---

## Task 6: 智能分析引擎增强

**Files:** Modify `js/analysis.js`

- [ ] Step 1: 新增退款异常检测（退款率环比超50%标记）
- [ ] Step 2: 新增追单结构分析（往期追单占比变化）
- [ ] Step 3: 新增入群率与转化率关联分析
- [ ] Step 4: 新增到课转化率分析（直播质量评估）

---

## Task 7: 验证 + 提交

- [ ] Step 1: 浏览器验证所有视图的图表渲染
- [ ] Step 2: 验证筛选器联动
- [ ] Step 3: git commit v3

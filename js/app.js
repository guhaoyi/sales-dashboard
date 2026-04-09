/**
 * 主应用逻辑
 * 数据加载、筛选、视图路由、渲染调度
 */
(async function () {
  'use strict';

  // === 全局数据 ===
  const DATA = { conversion: [], orders: [], weeklyOps: [], memberContact: [], memberService: [], meta: {} };
  let currentView = 'overview';
  let gmvMode = 'total'; // total | sku

  // === 数据加载 ===
  async function loadData() {
    const files = [
      ['conversion', 'data/conversion.json'],
      ['orders', 'data/orders.json'],
      ['weeklyOps', 'data/weekly-ops.json'],
      ['memberContact', 'data/member-contact.json'],
      ['memberService', 'data/member-service.json'],
      ['meta', 'data/meta.json']
    ];
    const results = await Promise.all(files.map(([, url]) => fetch(url).then(r => r.json()).catch(() => [])));
    // Convert columnar {c,r} format to array of objects
    function expandColumnar(d) {
      if (d && d.c && d.r) {
        const cols = d.c;
        return d.r.map(row => {
          const obj = {};
          for (let i = 0; i < cols.length; i++) obj[cols[i]] = i < row.length ? row[i] : null;
          return obj;
        });
      }
      return Array.isArray(d) ? d : [];
    }
    files.forEach(([key], i) => {
      const raw = results[i];
      DATA[key] = (key === 'meta') ? raw : expandColumnar(raw);
    });

    // 预处理转化数据：提取常用字段到标准化属性
    DATA.conversion.forEach(d => {
      d._month = d['月度'] ? normalizeMonth(d['月度']) : '';
      d._period = d['期数'] || '';
      d._sku = d['SKU'] || '';
      d._city = d['城市'] || '';
      d._profile = d['例子画像'] || '';
      d._leader = d['组长'] || '';
      d._region = d['运营负责人'] || d['分区负责人'] || '';
      d._mainR = d['主R'] || '';
      d._leads = num(d['例子数']);
      d._conv = num(d['总转数（减去退单）']) || num(d['总转数（包含退单）']);
      d._directConv = num(d['直播转化数']);
      d._followConv = num(d['总追单数']);
      d._gmv = num(d['总GMV（未退）']) || num(d['总GMV(除退款+含往期)']);
      d._gmvNet = num(d['总GMV(除退款+含往期)']) || num(d['总GMV(除退款+不含往期)']);
      d._d1Rate = num(d['DAY1到课率']);
      d._d2Rate = num(d['DAY2到课率']);
      d._d3Rate = num(d['DAY3到课率']);
      d._d1Count = num(d['DAY3到课数']) > 0 ? Math.round(num(d['DAY1到课率']) * num(d['例子数'])) : 0;
      d._d2Count = num(d['DAY2到课率']) > 0 ? Math.round(num(d['DAY2到课率']) * num(d['例子数'])) : 0;
      d._d3Count = num(d['DAY3到课数']) || (num(d['DAY3到课率']) > 0 ? Math.round(num(d['DAY3到课率']) * num(d['例子数'])) : 0);
      d._liveConvRate = num(d['直播间转化率']);
      d._totalRate = num(d['【总转率（含退单）】']) || num(d['【总转率除退款+含往期】']);
      d._directRate = num(d['【直转率】']);
      d._arpu = num(d['ARPU（剔除退款）']) || num(d['【ARPU】']);
      d._refundCount = num(d['退单数（开营前）']) || num(d['学霸-退单数（开营前）']);
      d._refundGmv = num(d['退款GMV']);
      d._refundRate = num(d['退款率（开营前）']);
      d._directRefund = num(d['直转退单数']);
      d._price = num(d['单价']);
      // 分日GMV和直转
      d._day2Gmv = num(d['DAY2-GMV']);
      d._day3Gmv = num(d['DAY3-GMV']);
      d._day2Direct = num(d['DAY2直转数']);
      d._day3Direct = num(d['DAY3直转数']);
      d._day2DirectRate = num(d['DAY2直转率']);
      d._day3DirectRate = num(d['DAY3直转率']);
      // 预约
      d._d1BookCount = num(d['DAY1预约数']);
      d._d2BookCount = num(d['DAY2预约数']);
      d._d3BookCount = num(d['DAY3预约数']);
      d._d1BookRate = num(d['DAY1预约率']);
      d._d2BookRate = num(d['DAY2预约率']);
      d._d3BookRate = num(d['DAY3预约率']);
      // 追单拆分
      d._followThis = num(d['本期追单数']);
      d._followThisGmv = num(d['本期追单GMV']);
      d._followThisRate = num(d['本期追单率']);
      d._followPrev = num(d['往期追单数']);
      d._followPrevGmv = num(d['往期追单GMV']);
      d._followPrevRate = num(d['往期追单率']);
      d._followRatio = num(d['追单占比']);
      // 入群
      d._joinCount = num(d['入群数']);
      d._joinRate = num(d['入群率']);
      // 回访
      d._callbackCount = num(d['回访回复数']);
      d._callbackRate = num(d['回访回复率']);
      // 到课转化率、30分钟到课率
      d._attendConvRate = num(d['到课-直播转化率']);
      d._d1Rate30 = num(d['D1-30分钟到课率']);
      d._d2Rate30 = num(d['D2-30分钟到课率']);
      d._d3Rate30 = num(d['D3-30分钟到课率']);
      // 其他维度
      d._freshness = d['例子新鲜度'] || '';
      d._profile2 = d['例子画像二级'] || '';
      d._convCycle = d['转化周期'] || '';
      d._liveVersion = d['大课直播版本'] || '';
    });

    // 预处理报单数据
    DATA.orders.forEach(d => {
      d._month = d['创建时间'] ? (() => {
        const dt = new Date(typeof d['创建时间'] === 'number' ? d['创建时间'] : Date.parse(d['创建时间']));
        return dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0');
      })() : '';
      d._period = d['期数'] || '';
      d._sku = d['SKU'] || '';
      d._promoter = d['推广员姓名'] || '';
      d._status = d['审批状态'] || '';
    });

    // 填充筛选器选项
    populateFilters();

    // 更新元信息
    if (DATA.meta.updatedAt) {
      const dt = new Date(DATA.meta.updatedAt);
      document.getElementById('dataMeta').textContent =
        `数据更新: ${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')} ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
    }
  }

  function normalizeMonth(m) {
    if (!m) return '';
    // "2024-1月" → "2024-01", "2024-12月" → "2024-12"
    const match = m.match(/(\d{4})-?(\d{1,2})/);
    if (match) return match[1] + '-' + match[2].padStart(2, '0');
    return m;
  }

  function num(v) {
    if (v == null) return 0;
    if (typeof v === 'number') return v;
    if (typeof v === 'object' && v.value) {
      const arr = Array.isArray(v.value) ? v.value : [v.value];
      return Number(arr[0]) || 0;
    }
    return parseFloat(v) || 0;
  }

  // === 筛选器 ===
  function populateFilters() {
    const skus = new Set(), cities = new Set(), profiles = new Set(), months = new Set();
    DATA.conversion.forEach(d => {
      if (d._sku) skus.add(d._sku);
      if (d._city) cities.add(d._city);
      if (d._profile) profiles.add(d._profile);
      if (d._month) months.add(d._month);
    });

    fillSelect('filterSku', skus, '全部SKU');
    fillSelect('filterCity', cities, '全部城市');
    fillSelect('filterProfile', profiles, '全部画像');

    // 月份选择器
    const sortedMonths = [...months].sort();
    const monthLabels = sortedMonths.map(m => {
      const p = m.match(/(\d{4})-(\d{1,2})/);
      return p ? p[1] + '年' + parseInt(p[2]) + '月' : m;
    });
    const startEl = document.getElementById('filterStart');
    const endEl = document.getElementById('filterEnd');
    startEl.innerHTML = sortedMonths.map((m, i) => `<option value="${m}">${monthLabels[i]}</option>`).join('');
    endEl.innerHTML = sortedMonths.map((m, i) => `<option value="${m}">${monthLabels[i]}</option>`).join('');
    startEl.value = sortedMonths[0] || '2024-01';
    endEl.value = sortedMonths[sortedMonths.length - 1] || '2026-04';
  }

  function fillSelect(id, values, allLabel) {
    const el = document.getElementById(id);
    const current = el.value;
    el.innerHTML = `<option value="all">${allLabel}</option>` +
      [...values].sort().map(v => `<option value="${v}">${v}</option>`).join('');
    el.value = current || 'all';
  }

  function getFilters() {
    return {
      start: document.getElementById('filterStart').value || '2024-01',
      end: document.getElementById('filterEnd').value || '2026-12',
      sku: document.getElementById('filterSku').value,
      city: document.getElementById('filterCity').value,
      profile: document.getElementById('filterProfile').value
    };
  }

  function filterConversion(filters) {
    return DATA.conversion.filter(d => {
      if (d._month < filters.start || d._month > filters.end) return false;
      if (filters.sku !== 'all' && d._sku !== filters.sku) return false;
      if (filters.city !== 'all' && d._city !== filters.city) return false;
      if (filters.profile !== 'all' && d._profile !== filters.profile) return false;
      return true;
    });
  }

  function filterOrders(filters) {
    return DATA.orders.filter(d => {
      if (d._month < filters.start || d._month > filters.end) return false;
      if (filters.sku !== 'all' && d._sku !== filters.sku) return false;
      return true;
    });
  }

  // === 聚合 ===
  function aggregateByMonth(data) {
    const map = {};
    data.forEach(d => {
      const m = d._month;
      if (!m) return;
      if (!map[m]) map[m] = { month: m, gmv: 0, gmvNet: 0, leads: 0, totalConv: 0, directConv: 0, followConv: 0,
        d1Sum: 0, d2Sum: 0, d3Sum: 0, d1Count: 0, d2Count: 0, d3Count: 0, refundSum: 0, refundCount: 0, refundGmv: 0,
        day2Gmv: 0, day3Gmv: 0, day2Direct: 0, day3Direct: 0,
        d1BookSum: 0, d2BookSum: 0, d3BookSum: 0, d1BookCount: 0, d2BookCount: 0, d3BookCount: 0,
        followThis: 0, followThisGmv: 0, followPrev: 0, followPrevGmv: 0,
        joinSum: 0, joinCount: 0, callbackSum: 0, callbackCount: 0, callbackN: 0,
        attendConvSum: 0, attendConvN: 0,
        d1Rate30Sum: 0, d2Rate30Sum: 0, d3Rate30Sum: 0, rate30N: 0,
        count: 0 };
      const o = map[m];
      o.gmv += d._gmv; o.gmvNet += d._gmvNet; o.leads += d._leads;
      o.totalConv += d._conv; o.directConv += d._directConv; o.followConv += d._followConv;
      o.d1Sum += d._d1Rate * d._leads; o.d2Sum += d._d2Rate * d._leads; o.d3Sum += d._d3Rate * d._leads;
      o.d1Count += d._d1Count; o.d2Count += d._d2Count; o.d3Count += d._d3Count;
      o.refundSum += d._refundRate * d._leads; o.refundCount += d._refundCount; o.refundGmv += d._refundGmv;
      // 分日
      o.day2Gmv += d._day2Gmv; o.day3Gmv += d._day3Gmv;
      o.day2Direct += d._day2Direct; o.day3Direct += d._day3Direct;
      // 预约
      o.d1BookSum += d._d1BookRate * d._leads; o.d2BookSum += d._d2BookRate * d._leads; o.d3BookSum += d._d3BookRate * d._leads;
      o.d1BookCount += d._d1BookCount; o.d2BookCount += d._d2BookCount; o.d3BookCount += d._d3BookCount;
      // 追单拆分
      o.followThis += d._followThis; o.followThisGmv += d._followThisGmv;
      o.followPrev += d._followPrev; o.followPrevGmv += d._followPrevGmv;
      // 入群
      o.joinCount += d._joinCount; o.joinSum += d._joinRate * d._leads;
      // 回访
      if (d._callbackRate > 0) { o.callbackSum += d._callbackRate; o.callbackN++; }
      o.callbackCount += d._callbackCount;
      // 到课转化率
      if (d._attendConvRate > 0) { o.attendConvSum += d._attendConvRate; o.attendConvN++; }
      // 30分钟到课率
      if (d._d1Rate30 > 0 || d._d2Rate30 > 0 || d._d3Rate30 > 0) {
        o.d1Rate30Sum += d._d1Rate30 * d._leads; o.d2Rate30Sum += d._d2Rate30 * d._leads; o.d3Rate30Sum += d._d3Rate30 * d._leads;
        o.rate30N += d._leads;
      }
      o.count++;
    });
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month)).map(o => ({
      ...o,
      totalRate: o.leads > 0 ? o.totalConv / o.leads : 0,
      directRate: o.leads > 0 ? o.directConv / o.leads : 0,
      followRate: o.leads > 0 ? o.followConv / o.leads : 0,
      d1Rate: o.leads > 0 ? o.d1Sum / o.leads : 0,
      d2Rate: o.leads > 0 ? o.d2Sum / o.leads : 0,
      d3Rate: o.leads > 0 ? o.d3Sum / o.leads : 0,
      d1BookRate: o.leads > 0 ? o.d1BookSum / o.leads : 0,
      d2BookRate: o.leads > 0 ? o.d2BookSum / o.leads : 0,
      d3BookRate: o.leads > 0 ? o.d3BookSum / o.leads : 0,
      joinRate: o.leads > 0 ? o.joinSum / o.leads : 0,
      callbackRate: o.callbackN > 0 ? o.callbackSum / o.callbackN : 0,
      attendConvRate: o.attendConvN > 0 ? o.attendConvSum / o.attendConvN : 0,
      d1Rate30: o.rate30N > 0 ? o.d1Rate30Sum / o.rate30N : 0,
      d2Rate30: o.rate30N > 0 ? o.d2Rate30Sum / o.rate30N : 0,
      d3Rate30: o.rate30N > 0 ? o.d3Rate30Sum / o.rate30N : 0,
      leadValue: o.leads > 0 ? o.gmv / o.leads : 0,
      arpu: o.totalConv > 0 ? o.gmvNet / o.totalConv : 0,
      refundRate: o.leads > 0 ? o.refundSum / o.leads : 0
    }));
  }

  // === KPI 渲染 ===
  function renderOverviewKpi(monthlyAgg, rawData) {
    const totalGmv = rawData.reduce((s, d) => s + d._gmv, 0);
    const totalGmvNet = rawData.reduce((s, d) => s + d._gmvNet, 0);
    const totalLeads = rawData.reduce((s, d) => s + d._leads, 0);
    const totalConv = rawData.reduce((s, d) => s + d._conv, 0);
    const totalRate = totalLeads > 0 ? totalConv / totalLeads : 0;
    const avgValue = totalLeads > 0 ? totalGmv / totalLeads : 0;
    const arpu = totalConv > 0 ? totalGmvNet / totalConv : 0;

    // 环比
    let gmvChg = null, leadsChg = null, rateChg = null, valueChg = null;
    if (monthlyAgg.length >= 2) {
      const last = monthlyAgg[monthlyAgg.length - 1], prev = monthlyAgg[monthlyAgg.length - 2];
      gmvChg = prev.gmv > 0 ? (last.gmv - prev.gmv) / prev.gmv : null;
      leadsChg = prev.leads > 0 ? (last.leads - prev.leads) / prev.leads : null;
      rateChg = prev.totalRate > 0 ? (last.totalRate - prev.totalRate) / prev.totalRate : null;
      valueChg = prev.leadValue > 0 ? (last.leadValue - prev.leadValue) / prev.leadValue : null;
    }

    document.getElementById('overviewKpi').innerHTML = [
      kpiCard('总 GMV', Fmt.money(totalGmv), gmvChg, Fmt.money(totalGmvNet) + ' (净)'),
      kpiCard('总例子数', Fmt.money(totalLeads), leadsChg, Fmt.int(totalConv) + ' 转化'),
      kpiCard('整体转化率', Fmt.pct(totalRate), rateChg),
      kpiCard('例子价值', '¥' + avgValue.toFixed(1), valueChg),
      kpiCard('ARPU', '¥' + arpu.toFixed(0), null, '客单价'),
      kpiCard('数据期数', rawData.length > 0 ? [...new Set(rawData.map(d => d._period))].filter(Boolean).length + '期' : '-', null,
        monthlyAgg.length + '个月')
    ].join('');
  }

  function kpiCard(label, value, change, sub) {
    let changeHtml = '';
    if (change !== null && change !== undefined && isFinite(change)) {
      const up = change >= 0;
      const cls = Math.abs(change) < 0.005 ? 'flat' : (up ? 'up' : 'down');
      const arrow = cls === 'flat' ? '→' : (up ? '↑' : '↓');
      changeHtml = `<div class="kpi-change ${cls}">${arrow} ${Math.abs(change * 100).toFixed(1)}% 环比</div>`;
    }
    return `<div class="kpi-card">
      <div class="kpi-label">${label}</div>
      <div class="kpi-value">${value}</div>
      ${sub ? `<div class="kpi-sub">${sub}</div>` : ''}
      ${changeHtml}
    </div>`;
  }

  function renderOrderKpi(orders) {
    const total = orders.length;
    const approved = orders.filter(d => d._status === '同意').length;
    const rejected = orders.filter(d => d._status === '拒绝').length;
    const pending = orders.filter(d => d._status === '待修正').length;
    const rate = total > 0 ? (approved / total * 100).toFixed(1) + '%' : '-';

    document.getElementById('orderKpi').innerHTML = [
      kpiCard('总报单数', Fmt.int(total), null),
      kpiCard('已通过', Fmt.int(approved), null, '通过率 ' + rate),
      kpiCard('已拒绝', Fmt.int(rejected), null),
      kpiCard('待修正', Fmt.int(pending), null)
    ].join('');
  }

  // === 分析渲染 ===
  function renderAnalysis(monthlyAgg, rawData) {
    const items = Analysis.generate(monthlyAgg, rawData);
    document.getElementById('analysisContent').innerHTML = items.map(it =>
      `<div class="analysis-item ${it.type}"><div class="ai-label">${it.label}</div><div class="ai-text">${it.text}</div></div>`
    ).join('');
  }

  // === 表格实例 ===
  let teamTable, memberTable, orderTable, detailTable;

  function initTables() {
    teamTable = new DataTable({
      tableId: 'teamTable', pageInfoId: 'teamPageInfo', pageBtnsId: 'teamPageBtns', searchId: 'teamSearch',
      pageSize: 50, defaultSort: '_gmv',
      columns: [
        { key: '_mainR', label: '推广员', width: '100px' },
        { key: '_leader', label: '组长', width: '80px' },
        { key: '_region', label: '负责人', width: '80px' },
        { key: '_city', label: '城市', width: '60px' },
        { key: '_period', label: '期数', width: '70px' },
        { key: '_sku', label: 'SKU', fmt: v => Fmt.sku(v) },
        { key: '_leads', label: '例子数', fmt: v => Fmt.int(v) },
        { key: '_conv', label: '转化数', fmt: v => Fmt.int(v) },
        { key: '_totalRate', label: '转化率', fmt: v => Fmt.pct(v) },
        { key: '_gmv', label: 'GMV', fmt: v => Fmt.money(v) },
        { key: '_arpu', label: 'ARPU', fmt: v => Fmt.yuan(v) }
      ]
    });

    memberTable = new DataTable({
      tableId: 'memberTable', pageInfoId: 'memberPageInfo', pageBtnsId: 'memberPageBtns', searchId: 'memberSearch',
      pageSize: 50,
      columns: [
        { key: '成员', label: '成员', width: '120px', fmt: v => typeof v === 'string' ? v : (Array.isArray(v) ? v.map(x => x.text || x).join('') : '-') },
        { key: '部门', label: '部门', width: '80px' },
        { key: '发起申请数', label: '申请数', fmt: v => Fmt.int(v) },
        { key: '新增学员数', label: '新增学员', fmt: v => Fmt.int(v) },
        { key: '聊天总数', label: '聊天数', fmt: v => Fmt.int(v) },
        { key: '发送消息数', label: '消息数', fmt: v => Fmt.int(v) },
        { key: '已回复聊天占比', label: '回复率', fmt: v => v != null ? (Number(v) > 1 ? Number(v).toFixed(0) + '%' : Fmt.pct(v)) : '-' },
        { key: '平均首次回复时长', label: '首次回复', width: '90px' },
        { key: '删除/拉黑成员的学员数', label: '删除学员', fmt: v => Fmt.int(v) },
        { key: '日期', label: '日期', fmt: v => Fmt.date(v) }
      ]
    });

    orderTable = new DataTable({
      tableId: 'orderTable', pageInfoId: 'orderPageInfo', pageBtnsId: 'orderPageBtns', searchId: 'orderSearch',
      pageSize: 100, defaultSort: '创建时间',
      columns: [
        { key: '创建时间', label: '时间', fmt: v => Fmt.date(v), width: '90px' },
        { key: '_promoter', label: '推广员', width: '80px' },
        { key: '_period', label: '期数', width: '70px' },
        { key: '_sku', label: 'SKU', fmt: v => Fmt.sku(v) },
        { key: '_status', label: '状态', fmt: v => Fmt.status(v) },
        { key: '组长', label: '组长', width: '80px' },
        { key: '分区负责人', label: '负责人', width: '80px' },
        { key: '例子画像', label: '画像', width: '80px' },
        { key: '审批备注', label: '备注', width: '150px' }
      ]
    });

    detailTable = new DataTable({
      tableId: 'detailTable', pageInfoId: 'detailPageInfo', pageBtnsId: 'detailPageBtns', searchId: 'detailSearch',
      pageSize: 100, defaultSort: '_month',
      columns: [
        { key: '_month', label: '月度', width: '70px' },
        { key: '_period', label: '期数', width: '70px' },
        { key: '_mainR', label: '推广员', width: '80px' },
        { key: '_leader', label: '组长', width: '70px' },
        { key: '_sku', label: 'SKU', fmt: v => Fmt.sku(v) },
        { key: '_profile', label: '画像', width: '80px' },
        { key: '_city', label: '城市', width: '50px' },
        { key: '_leads', label: '例子数', fmt: v => Fmt.int(v) },
        { key: '_conv', label: '转化数', fmt: v => Fmt.int(v) },
        { key: '_totalRate', label: '转化率', fmt: v => Fmt.pct(v) },
        { key: '_directRate', label: '直转率', fmt: v => Fmt.pct(v) },
        { key: '_gmv', label: 'GMV', fmt: v => Fmt.money(v) },
        { key: '_gmvNet', label: '净GMV', fmt: v => Fmt.money(v) },
        { key: '_d3Rate', label: 'D3到课率', fmt: v => Fmt.pct(v) },
        { key: '_arpu', label: 'ARPU', fmt: v => Fmt.yuan(v) }
      ]
    });

    // 报单状态筛选
    document.getElementById('orderStatusFilter').addEventListener('change', () => {
      const status = document.getElementById('orderStatusFilter').value;
      orderTable.setExtraFilter(status === 'all' ? null : d => d._status === status);
    });
  }

  // === 视图渲染 ===
  function renderView() {
    const filters = getFilters();
    const convData = filterConversion(filters);
    const monthlyAgg = aggregateByMonth(convData);

    switch (currentView) {
      case 'overview':
        renderOverviewKpi(monthlyAgg, convData);
        Charts.renderGmvTrend(monthlyAgg, convData, gmvMode);
        Charts.renderRateTrend(monthlyAgg);
        Charts.renderAttendTrend(monthlyAgg);
        Charts.renderSkuBar(monthlyAgg, convData);
        Charts.renderLeadValue(monthlyAgg);
        Charts.renderRefundTrend(monthlyAgg);
        renderAnalysis(monthlyAgg, convData);
        break;

      case 'conversion':
        Charts.renderFunnel(monthlyAgg);
        Charts.renderConvPie(monthlyAgg);
        Charts.renderProfileBar(convData);
        Charts.renderPeriodTrend(convData);
        Charts.renderDayCompare(monthlyAgg);
        Charts.renderFollowStructure(monthlyAgg);
        Charts.renderFullFunnel(monthlyAgg);
        break;

      case 'team':
        Charts.renderLeaderRank(convData);
        Charts.renderRegionCompare(convData);
        teamTable.setData(convData);
        memberTable.setData(DATA.memberContact);
        break;

      case 'orders':
        const ordersFiltered = filterOrders(filters);
        renderOrderKpi(ordersFiltered);
        Charts.renderOrderPie(ordersFiltered);
        Charts.renderOrderTrend(ordersFiltered);
        orderTable.setData(ordersFiltered);
        break;

      case 'deep':
        Charts.renderJoinRate(monthlyAgg);
        Charts.renderCallback(monthlyAgg);
        Charts.renderAttendConv(monthlyAgg);
        Charts.render30minAttend(monthlyAgg);
        Charts.renderFreshness(convData);
        Charts.renderProfile2(convData);
        Charts.renderConvCycle(convData);
        Charts.renderLiveVersion(convData);
        break;

      case 'detail':
        detailTable.setData(convData);
        break;
    }

    // 延迟 resize 确保图表尺寸正确
    setTimeout(() => Charts.resizeAll(), 100);
  }

  // === 视图切换 ===
  function switchView(viewId) {
    currentView = viewId;
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const viewEl = document.getElementById('view-' + viewId);
    if (viewEl) viewEl.classList.add('active');
    const navEl = document.querySelector(`.nav-item[data-view="${viewId}"]`);
    if (navEl) navEl.classList.add('active');
    renderView();
  }

  // === 事件绑定 ===
  function bindEvents() {
    // 导航
    document.querySelectorAll('.nav-item').forEach(el => {
      el.addEventListener('click', () => switchView(el.dataset.view));
    });

    // 筛选器
    ['filterStart', 'filterEnd', 'filterSku', 'filterCity', 'filterProfile'].forEach(id => {
      document.getElementById(id).addEventListener('change', () => renderView());
    });

    // GMV 图表切换
    document.getElementById('gmvToggle').addEventListener('click', e => {
      const btn = e.target.closest('button');
      if (!btn) return;
      gmvMode = btn.dataset.mode;
      document.querySelectorAll('#gmvToggle button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filters = getFilters();
      const convData = filterConversion(filters);
      const monthlyAgg = aggregateByMonth(convData);
      Charts.renderGmvTrend(monthlyAgg, convData, gmvMode);
    });
  }

  // === 启动 ===
  try {
    await loadData();
    initTables();
    bindEvents();

    // 隐藏 loading，显示默认视图
    document.getElementById('loadingScreen').style.display = 'none';
    switchView('overview');

    console.log('✓ 看板加载完成', {
      conversion: DATA.conversion.length,
      orders: DATA.orders.length,
      weeklyOps: DATA.weeklyOps.length,
      memberContact: DATA.memberContact.length,
      memberService: DATA.memberService.length
    });
  } catch (err) {
    console.error('加载失败:', err);
    document.getElementById('loadingScreen').innerHTML =
      `<div style="color:#ef4444;text-align:center"><div style="font-size:24px;margin-bottom:12px">⚠️</div>
       <div>数据加载失败</div><div style="font-size:12px;color:#6b7280;margin-top:8px">${err.message}</div>
       <div style="font-size:12px;color:#6b7280;margin-top:4px">请确认已运行 node fetch-data.js 并启动本地服务器</div></div>`;
  }
})();

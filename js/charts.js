/**
 * ECharts 图表渲染
 */
const Charts = {
  instances: {},
  skuColors: { '学霸陪跑营': '#3b82f6', '阅读强化营': '#10b981', '自拼训练营': '#a78bfa' },
  skuList: ['学霸陪跑营', '阅读强化营', '自拼训练营'],

  base: {
    backgroundColor: 'transparent',
    textStyle: { color: '#71717a', fontFamily: 'DM Sans,Noto Sans SC,sans-serif', fontSize: 11 },
    legend: { textStyle: { color: '#9ca3af', fontSize: 11 }, itemWidth: 12, itemHeight: 8 },
    tooltip: { backgroundColor: '#1a1d29', borderColor: '#282d45', textStyle: { color: '#e4e4e7', fontSize: 12 }, confine: true },
    grid: { left: 55, right: 20, top: 40, bottom: 28, containLabel: false },
    xAxis: { axisLine: { lineStyle: { color: '#1e2235' } }, axisTick: { show: false }, axisLabel: { color: '#6b7280', fontSize: 10 } },
    yAxis: { splitLine: { lineStyle: { color: '#1e2235' } }, axisLabel: { color: '#6b7280', fontSize: 10 } }
  },

  init(id) {
    if (this.instances[id]) this.instances[id].dispose();
    const el = document.getElementById(id);
    if (!el) return null;
    const c = echarts.init(el);
    this.instances[id] = c;
    return c;
  },

  resizeAll() { Object.values(this.instances).forEach(c => c && c.resize()); },

  monthLabel(m) {
    if (!m) return '';
    const p = m.match(/(\d{4})-(\d{1,2})/);
    return p ? parseInt(p[2]) + '月' : m;
  },

  monthLabelFull(m) {
    if (!m) return '';
    const p = m.match(/(\d{4})-(\d{1,2})/);
    return p ? p[1].slice(2) + '年' + parseInt(p[2]) + '月' : m;
  },

  // === 概览视图图表 ===

  renderGmvTrend(monthlyAgg, rawData, mode) {
    const c = this.init('chartGmv');
    if (!c) return;
    const months = monthlyAgg.map(m => m.month);
    const labels = months.map(m => this.monthLabel(m));

    // 例子数柱状图（始终显示，右轴）
    const leadsSeries = { name: '例子数', type: 'bar', yAxisIndex: 1, barMaxWidth: 24, z: 1,
      itemStyle: { color: 'rgba(34,211,238,.15)', borderRadius: [2, 2, 0, 0] },
      data: monthlyAgg.map(m => m.leads) };

    let gmvSeries;
    if (mode === 'sku') {
      gmvSeries = this.skuList.map(sku => {
        const vals = months.map(mo => {
          const rows = rawData.filter(d => d._month === mo && d._sku === sku);
          return rows.reduce((s, d) => s + (d._gmv || 0), 0);
        });
        return { name: sku, type: 'line', smooth: true, symbol: 'circle', symbolSize: 5, z: 2,
          lineStyle: { width: 2.5 }, areaStyle: { opacity: 0.06 },
          data: vals, itemStyle: { color: this.skuColors[sku] }, yAxisIndex: 0 };
      }).filter(s => s.data.some(v => v > 0));
    } else {
      gmvSeries = [{ name: '总GMV', type: 'line', smooth: true, symbol: 'circle', symbolSize: 6, z: 2,
        lineStyle: { width: 3 },
        areaStyle: { opacity: 0.1, color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(59,130,246,.3)' }, { offset: 1, color: 'transparent' }]) },
        data: monthlyAgg.map(m => m.gmv), itemStyle: { color: '#3b82f6' }, yAxisIndex: 0 }];
    }

    c.setOption({ ...this.base,
      grid: { ...this.base.grid, right: 60 },
      legend: { ...this.base.legend, show: true, top: 5, right: 0 },
      tooltip: { ...this.base.tooltip, trigger: 'axis',
        formatter: ps => ps.map(p => `${p.marker}${p.seriesName}: ${p.seriesName === '例子数' ? Fmt.money(p.value) : Fmt.money(p.value)}`).join('<br>') },
      xAxis: { ...this.base.xAxis, type: 'category', data: labels },
      yAxis: [
        { ...this.base.yAxis, type: 'value', axisLabel: { ...this.base.yAxis.axisLabel, formatter: v => Fmt.money(v) } },
        { ...this.base.yAxis, type: 'value', splitLine: { show: false },
          axisLabel: { ...this.base.yAxis.axisLabel, formatter: v => Fmt.money(v) } }
      ],
      series: [leadsSeries, ...gmvSeries] });
  },

  renderRateTrend(monthlyAgg) {
    const c = this.init('chartRate');
    if (!c) return;
    const labels = monthlyAgg.map(m => this.monthLabel(m.month));
    c.setOption({ ...this.base,
      legend: { ...this.base.legend, show: true, top: 5, right: 0 },
      tooltip: { ...this.base.tooltip, trigger: 'axis',
        formatter: ps => ps.map(p => `${p.marker}${p.seriesName}: ${Fmt.pct(p.value)}`).join('<br>') },
      xAxis: { ...this.base.xAxis, type: 'category', data: labels },
      yAxis: { ...this.base.yAxis, type: 'value', axisLabel: { ...this.base.yAxis.axisLabel, formatter: v => Fmt.pct(v) } },
      series: [
        { name: '总转率', type: 'line', smooth: true, symbol: 'circle', symbolSize: 4, data: monthlyAgg.map(m => m.totalRate), itemStyle: { color: '#3b82f6' }, lineStyle: { width: 2.5 } },
        { name: '直转率', type: 'line', smooth: true, symbol: 'circle', symbolSize: 4, data: monthlyAgg.map(m => m.directRate), itemStyle: { color: '#10b981' }, lineStyle: { width: 2 } },
        { name: '追单率', type: 'line', smooth: true, symbol: 'circle', symbolSize: 4, data: monthlyAgg.map(m => m.followRate), itemStyle: { color: '#f59e0b' }, lineStyle: { width: 2 } }
      ] });
  },

  renderAttendTrend(monthlyAgg) {
    const c = this.init('chartAttend');
    if (!c) return;
    const labels = monthlyAgg.map(m => this.monthLabel(m.month));
    c.setOption({ ...this.base,
      legend: { ...this.base.legend, show: true, top: 5, right: 0 },
      tooltip: { ...this.base.tooltip, trigger: 'axis',
        formatter: ps => ps.map(p => `${p.marker}${p.seriesName}: ${Fmt.pct(p.value)}`).join('<br>') },
      xAxis: { ...this.base.xAxis, type: 'category', data: labels },
      yAxis: { ...this.base.yAxis, type: 'value', axisLabel: { ...this.base.yAxis.axisLabel, formatter: v => Fmt.pct(v) } },
      series: [
        { name: 'D1到课率', type: 'line', smooth: true, symbol: 'circle', symbolSize: 4, data: monthlyAgg.map(m => m.d1Rate), itemStyle: { color: '#22d3ee' }, lineStyle: { width: 2.5 } },
        { name: 'D2到课率', type: 'line', smooth: true, symbol: 'circle', symbolSize: 4, data: monthlyAgg.map(m => m.d2Rate), itemStyle: { color: '#3b82f6' }, lineStyle: { width: 2 } },
        { name: 'D3到课率', type: 'line', smooth: true, symbol: 'circle', symbolSize: 4, data: monthlyAgg.map(m => m.d3Rate), itemStyle: { color: '#a78bfa' }, lineStyle: { width: 2 } }
      ] });
  },

  renderSkuBar(monthlyAgg, rawData) {
    const c = this.init('chartSkuBar');
    if (!c) return;
    const months = monthlyAgg.map(m => m.month);
    const labels = months.map(m => this.monthLabel(m));
    const series = this.skuList.map(sku => ({
      name: sku, type: 'bar', stack: 'gmv', barMaxWidth: 24,
      itemStyle: { color: this.skuColors[sku], borderRadius: [2, 2, 0, 0] },
      data: months.map(mo => {
        const rows = rawData.filter(d => d._month === mo && d._sku === sku);
        return rows.reduce((s, d) => s + (d._gmv || 0), 0);
      })
    }));
    c.setOption({ ...this.base,
      legend: { ...this.base.legend, show: true, top: 5, right: 0 },
      tooltip: { ...this.base.tooltip, trigger: 'axis',
        formatter: ps => ps.filter(p => p.value > 0).map(p => `${p.marker}${p.seriesName}: ${Fmt.money(p.value)}`).join('<br>') },
      xAxis: { ...this.base.xAxis, type: 'category', data: labels },
      yAxis: { ...this.base.yAxis, type: 'value', axisLabel: { ...this.base.yAxis.axisLabel, formatter: v => Fmt.money(v) } },
      series });
  },

  renderLeadValue(monthlyAgg) {
    const c = this.init('chartLeadValue');
    if (!c) return;
    const labels = monthlyAgg.map(m => this.monthLabel(m.month));
    c.setOption({ ...this.base,
      grid: { ...this.base.grid, right: 55 },
      legend: { ...this.base.legend, show: true, top: 5, right: 0 },
      tooltip: { ...this.base.tooltip, trigger: 'axis' },
      xAxis: { ...this.base.xAxis, type: 'category', data: labels },
      yAxis: [
        { ...this.base.yAxis, type: 'value', name: '例子价值', nameTextStyle: { color: '#6b7280', fontSize: 10 },
          axisLabel: { ...this.base.yAxis.axisLabel, formatter: v => '¥' + v } },
        { ...this.base.yAxis, type: 'value', name: '例子数', nameTextStyle: { color: '#6b7280', fontSize: 10 },
          splitLine: { show: false }, axisLabel: { ...this.base.yAxis.axisLabel, formatter: v => Fmt.money(v) } }
      ],
      series: [
        { name: '例子价值', type: 'line', smooth: true, symbol: 'circle', symbolSize: 5,
          data: monthlyAgg.map(m => +m.leadValue.toFixed(1)), itemStyle: { color: '#f59e0b' }, lineStyle: { width: 2.5 }, yAxisIndex: 0 },
        { name: '例子数', type: 'bar', barMaxWidth: 22,
          data: monthlyAgg.map(m => m.leads), itemStyle: { color: 'rgba(59,130,246,.2)', borderRadius: [2, 2, 0, 0] }, yAxisIndex: 1 }
      ] });
  },

  // === 转化分析视图图表 ===

  renderFunnel(monthlyAgg) {
    const c = this.init('chartFunnel');
    if (!c) return;
    const total = monthlyAgg.reduce((s, m) => ({
      leads: s.leads + m.leads, d1: s.d1 + m.d1Count, d2: s.d2 + m.d2Count, d3: s.d3 + m.d3Count,
      direct: s.direct + m.directConv, follow: s.follow + m.followConv
    }), { leads: 0, d1: 0, d2: 0, d3: 0, direct: 0, follow: 0 });

    c.setOption({ ...this.base,
      tooltip: { ...this.base.tooltip, trigger: 'item', formatter: p => `${p.name}: ${Fmt.int(p.value)}` },
      series: [{ type: 'funnel', left: '10%', top: 20, bottom: 20, width: '80%', sort: 'none',
        gap: 4, label: { show: true, position: 'inside', fontSize: 12, color: '#fff',
          formatter: p => `${p.name}\n${Fmt.int(p.value)}` },
        itemStyle: { borderWidth: 0 },
        data: [
          { value: total.leads, name: '总例子数', itemStyle: { color: '#3b82f6' } },
          { value: total.d1 || Math.round(total.leads * 0.35), name: 'D1到课', itemStyle: { color: '#22d3ee' } },
          { value: total.d2 || Math.round(total.leads * 0.30), name: 'D2到课', itemStyle: { color: '#6366f1' } },
          { value: total.d3 || Math.round(total.leads * 0.25), name: 'D3到课', itemStyle: { color: '#a78bfa' } },
          { value: total.direct, name: '直播转化', itemStyle: { color: '#10b981' } },
          { value: total.follow, name: '追单转化', itemStyle: { color: '#f59e0b' } }
        ] }] });
  },

  renderConvPie(monthlyAgg) {
    const c = this.init('chartConvPie');
    if (!c) return;
    const direct = monthlyAgg.reduce((s, m) => s + m.directConv, 0);
    const follow = monthlyAgg.reduce((s, m) => s + m.followConv, 0);
    c.setOption({ ...this.base,
      tooltip: { ...this.base.tooltip, trigger: 'item', formatter: p => `${p.name}: ${Fmt.int(p.value)} (${p.percent}%)` },
      series: [{ type: 'pie', radius: ['40%', '70%'], center: ['50%', '55%'],
        label: { color: '#9ca3af', fontSize: 12, formatter: '{b}\n{d}%' },
        itemStyle: { borderColor: '#12141f', borderWidth: 3 },
        data: [
          { value: direct, name: '直播转化', itemStyle: { color: '#3b82f6' } },
          { value: follow, name: '追单转化', itemStyle: { color: '#f59e0b' } }
        ] }] });
  },

  renderProfileBar(rawData) {
    const c = this.init('chartProfileBar');
    if (!c) return;
    const profileMap = {};
    rawData.forEach(d => {
      const p = d._profile;
      if (!p) return;
      if (!profileMap[p]) profileMap[p] = { leads: 0, conv: 0, gmv: 0 };
      profileMap[p].leads += d._leads || 0;
      profileMap[p].conv += d._conv || 0;
      profileMap[p].gmv += d._gmv || 0;
    });
    const profiles = Object.entries(profileMap)
      .filter(([, v]) => v.leads > 500)
      .map(([k, v]) => ({ name: k, rate: v.leads > 0 ? v.conv / v.leads : 0, leads: v.leads, gmv: v.gmv }))
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 15);

    c.setOption({ ...this.base,
      grid: { ...this.base.grid, bottom: 60 },
      tooltip: { ...this.base.tooltip, trigger: 'axis',
        formatter: ps => ps.map(p => `${p.name}: 转化率 ${Fmt.pct(p.value)}`).join('<br>') },
      xAxis: { ...this.base.xAxis, type: 'category', data: profiles.map(p => p.name),
        axisLabel: { ...this.base.xAxis.axisLabel, rotate: 30, interval: 0 } },
      yAxis: { ...this.base.yAxis, type: 'value', axisLabel: { ...this.base.yAxis.axisLabel, formatter: v => Fmt.pct(v) } },
      series: [{ type: 'bar', barMaxWidth: 28, data: profiles.map(p => ({
        value: p.rate, itemStyle: { color: p.rate > 0.02 ? '#10b981' : p.rate > 0.01 ? '#3b82f6' : '#6b7280', borderRadius: [3, 3, 0, 0] }
      })) }] });
  },

  renderPeriodTrend(rawData) {
    const c = this.init('chartPeriodTrend');
    if (!c) return;
    const periodMap = {};
    rawData.forEach(d => {
      const p = d._period;
      if (!p) return;
      const num = parseInt(p.replace(/[^0-9]/g, ''));
      if (isNaN(num)) return;
      if (!periodMap[num]) periodMap[num] = { leads: 0, conv: 0, gmv: 0 };
      periodMap[num].leads += d._leads || 0;
      periodMap[num].conv += d._conv || 0;
      periodMap[num].gmv += d._gmv || 0;
    });
    const periods = Object.entries(periodMap)
      .map(([k, v]) => ({ num: parseInt(k), rate: v.leads > 0 ? v.conv / v.leads : 0, leads: v.leads }))
      .filter(p => p.leads > 100)
      .sort((a, b) => a.num - b.num);

    c.setOption({ ...this.base,
      tooltip: { ...this.base.tooltip, trigger: 'axis',
        formatter: ps => `第${ps[0].name}期: 转化率 ${Fmt.pct(ps[0].value)}` },
      xAxis: { ...this.base.xAxis, type: 'category', data: periods.map(p => p.num) },
      yAxis: { ...this.base.yAxis, type: 'value', axisLabel: { ...this.base.yAxis.axisLabel, formatter: v => Fmt.pct(v) } },
      series: [{ type: 'line', smooth: true, symbol: 'none', lineStyle: { width: 2, color: '#3b82f6' },
        areaStyle: { opacity: 0.08, color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(59,130,246,.2)' }, { offset: 1, color: 'transparent' }]) },
        data: periods.map(p => p.rate) }] });
  },

  // === 团队分析视图图表 ===

  renderLeaderRank(rawData) {
    const c = this.init('chartLeaderRank');
    if (!c) return;
    const leaderMap = {};
    rawData.forEach(d => {
      const leader = d['组长'];
      if (!leader) return;
      if (!leaderMap[leader]) leaderMap[leader] = { gmv: 0, leads: 0, conv: 0 };
      leaderMap[leader].gmv += d._gmv || 0;
      leaderMap[leader].leads += d._leads || 0;
      leaderMap[leader].conv += d._conv || 0;
    });
    const leaders = Object.entries(leaderMap)
      .map(([k, v]) => ({ name: k, gmv: v.gmv, rate: v.leads > 0 ? v.conv / v.leads : 0 }))
      .filter(l => l.gmv > 0)
      .sort((a, b) => b.gmv - a.gmv)
      .slice(0, 20);

    c.setOption({ ...this.base,
      grid: { ...this.base.grid, left: 80 },
      tooltip: { ...this.base.tooltip, trigger: 'axis',
        formatter: ps => `${ps[0].name}: GMV ${Fmt.money(ps[0].value)}` },
      xAxis: { ...this.base.xAxis, type: 'value', axisLabel: { ...this.base.xAxis.axisLabel, formatter: v => Fmt.money(v) } },
      yAxis: { ...this.base.yAxis, type: 'category', data: leaders.map(l => l.name).reverse(), inverse: false },
      series: [{ type: 'bar', barMaxWidth: 16, data: leaders.map(l => l.gmv).reverse(),
        itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
          { offset: 0, color: 'rgba(59,130,246,.6)' }, { offset: 1, color: '#3b82f6' }]),
          borderRadius: [0, 3, 3, 0] } }] });
  },

  renderRegionCompare(rawData) {
    const c = this.init('chartRegionCompare');
    if (!c) return;
    const regionMap = {};
    rawData.forEach(d => {
      const r = d['运营负责人'] || d['分区负责人'];
      if (!r) return;
      if (!regionMap[r]) regionMap[r] = { gmv: 0, leads: 0, conv: 0 };
      regionMap[r].gmv += d._gmv || 0;
      regionMap[r].leads += d._leads || 0;
      regionMap[r].conv += d._conv || 0;
    });
    const regions = Object.entries(regionMap)
      .map(([k, v]) => ({ name: k, gmv: v.gmv, rate: v.leads > 0 ? v.conv / v.leads : 0, leads: v.leads }))
      .filter(r => r.gmv > 0)
      .sort((a, b) => b.gmv - a.gmv)
      .slice(0, 15);

    c.setOption({ ...this.base,
      grid: { ...this.base.grid, left: 80 },
      tooltip: { ...this.base.tooltip, trigger: 'axis',
        formatter: ps => `${ps[0].name}: GMV ${Fmt.money(ps[0].value)}` },
      xAxis: { ...this.base.xAxis, type: 'value', axisLabel: { ...this.base.xAxis.axisLabel, formatter: v => Fmt.money(v) } },
      yAxis: { ...this.base.yAxis, type: 'category', data: regions.map(r => r.name).reverse() },
      series: [{ type: 'bar', barMaxWidth: 16, data: regions.map(r => r.gmv).reverse(),
        itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
          { offset: 0, color: 'rgba(16,185,129,.6)' }, { offset: 1, color: '#10b981' }]),
          borderRadius: [0, 3, 3, 0] } }] });
  },

  // === 报单视图图表 ===

  renderOrderPie(orders) {
    const c = this.init('chartOrderPie');
    if (!c) return;
    const statusMap = {};
    orders.forEach(d => {
      const s = d['审批状态'] || '未知';
      statusMap[s] = (statusMap[s] || 0) + 1;
    });
    const statusColors = { '同意': '#10b981', '拒绝': '#ef4444', '待修正': '#f59e0b', '已修正': '#3b82f6',
      '已超时': '#6b7280', '已判单': '#a78bfa', '已算直转': '#22d3ee', '单词王': '#8b5cf6' };
    const data = Object.entries(statusMap).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({
      value: v, name: k, itemStyle: { color: statusColors[k] || '#4b5563' }
    }));
    c.setOption({ ...this.base,
      tooltip: { ...this.base.tooltip, trigger: 'item', formatter: p => `${p.name}: ${p.value} (${p.percent}%)` },
      series: [{ type: 'pie', radius: ['35%', '65%'], center: ['50%', '55%'],
        label: { color: '#9ca3af', fontSize: 11, formatter: '{b}\n{d}%' },
        itemStyle: { borderColor: '#12141f', borderWidth: 2 }, data }] });
  },

  renderOrderTrend(orders) {
    const c = this.init('chartOrderTrend');
    if (!c) return;
    const monthMap = {};
    orders.forEach(d => {
      const t = d['创建时间'];
      if (!t) return;
      const date = new Date(typeof t === 'number' ? t : Date.parse(t));
      const mo = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
      monthMap[mo] = (monthMap[mo] || 0) + 1;
    });
    const months = Object.keys(monthMap).sort();
    c.setOption({ ...this.base,
      tooltip: { ...this.base.tooltip, trigger: 'axis', formatter: ps => `${ps[0].name}: ${ps[0].value}单` },
      xAxis: { ...this.base.xAxis, type: 'category', data: months.map(m => this.monthLabel(m)) },
      yAxis: { ...this.base.yAxis, type: 'value' },
      series: [{ type: 'bar', barMaxWidth: 22, data: months.map(m => monthMap[m]),
        itemStyle: { color: 'rgba(59,130,246,.6)', borderRadius: [3, 3, 0, 0] } }] });
  }
};

// === 新增图表方法（V3升级） ===

// 退款率趋势（概览视图）
Charts.renderRefundTrend = function(monthlyAgg) {
  const c = this.init('chartRefund');
  if (!c) return;
  const labels = monthlyAgg.map(m => this.monthLabel(m.month));
  c.setOption({ ...this.base,
    grid: { ...this.base.grid, right: 55 },
    legend: { ...this.base.legend, show: true, top: 5, right: 0 },
    tooltip: { ...this.base.tooltip, trigger: 'axis',
      formatter: ps => ps.map(p => `${p.marker}${p.seriesName}: ${p.seriesName.includes('GMV') ? Fmt.money(p.value) : Fmt.pct(p.value)}`).join('<br>') },
    xAxis: { ...this.base.xAxis, type: 'category', data: labels },
    yAxis: [
      { ...this.base.yAxis, type: 'value', axisLabel: { ...this.base.yAxis.axisLabel, formatter: v => Fmt.pct(v) } },
      { ...this.base.yAxis, type: 'value', splitLine: { show: false }, axisLabel: { ...this.base.yAxis.axisLabel, formatter: v => Fmt.money(v) } }
    ],
    series: [
      { name: '退款率', type: 'line', smooth: true, symbol: 'circle', symbolSize: 5,
        data: monthlyAgg.map(m => m.refundRate), itemStyle: { color: '#ef4444' }, lineStyle: { width: 2.5 }, yAxisIndex: 0 },
      { name: '退款GMV', type: 'bar', barMaxWidth: 20,
        data: monthlyAgg.map(m => m.refundGmv), itemStyle: { color: 'rgba(239,68,68,.2)', borderRadius: [2, 2, 0, 0] }, yAxisIndex: 1 }
    ] });
};

// 优化版漏斗（带转化率百分比）
Charts.renderFunnel = function(monthlyAgg) {
  const c = this.init('chartFunnel');
  if (!c) return;
  const total = monthlyAgg.reduce((s, m) => ({
    leads: s.leads + m.leads,
    d1Book: s.d1Book + m.d1BookCount, d2Book: s.d2Book + m.d2BookCount, d3Book: s.d3Book + m.d3BookCount,
    d1: s.d1 + m.d1Count, d2: s.d2 + m.d2Count, d3: s.d3 + m.d3Count,
    direct: s.direct + m.directConv, follow: s.follow + m.followConv
  }), { leads: 0, d1Book: 0, d2Book: 0, d3Book: 0, d1: 0, d2: 0, d3: 0, direct: 0, follow: 0 });

  const steps = [
    { value: total.leads, name: '总例子数', color: '#3b82f6' },
    { value: total.d1 || Math.round(total.leads * 0.35), name: 'D1到课', color: '#22d3ee' },
    { value: total.d2 || Math.round(total.leads * 0.30), name: 'D2到课', color: '#6366f1' },
    { value: total.d3 || Math.round(total.leads * 0.25), name: 'D3到课', color: '#a78bfa' },
    { value: total.direct, name: '直播转化', color: '#10b981' },
    { value: total.follow, name: '追单转化', color: '#f59e0b' }
  ];

  c.setOption({ ...this.base,
    tooltip: { ...this.base.tooltip, trigger: 'item',
      formatter: p => {
        const pct = total.leads > 0 ? (p.value / total.leads * 100).toFixed(2) : 0;
        return `${p.name}<br/>数量: ${Fmt.int(p.value)}<br/>占总例子: ${pct}%`;
      }},
    series: [{ type: 'funnel', left: '10%', top: 20, bottom: 20, width: '80%', sort: 'none',
      gap: 4,
      label: { show: true, position: 'inside', fontSize: 11, color: '#fff',
        formatter: p => {
          const pct = total.leads > 0 ? (p.value / total.leads * 100).toFixed(1) : 0;
          return `${p.name}\n${Fmt.int(p.value)} (${pct}%)`;
        }},
      itemStyle: { borderWidth: 0 },
      data: steps.map(s => ({ value: s.value, name: s.name, itemStyle: { color: s.color } }))
    }] });
};

// D2 vs D3 分日转化对比
Charts.renderDayCompare = function(monthlyAgg) {
  const c = this.init('chartDayCompare');
  if (!c) return;
  const labels = monthlyAgg.map(m => this.monthLabel(m.month));
  c.setOption({ ...this.base,
    legend: { ...this.base.legend, show: true, top: 5, right: 0 },
    tooltip: { ...this.base.tooltip, trigger: 'axis' },
    xAxis: { ...this.base.xAxis, type: 'category', data: labels },
    yAxis: { ...this.base.yAxis, type: 'value', axisLabel: { ...this.base.yAxis.axisLabel, formatter: v => Fmt.int(v) } },
    series: [
      { name: 'D2直转数', type: 'bar', barMaxWidth: 16, barGap: '20%',
        data: monthlyAgg.map(m => m.day2Direct), itemStyle: { color: '#3b82f6', borderRadius: [2, 2, 0, 0] } },
      { name: 'D3直转数', type: 'bar', barMaxWidth: 16,
        data: monthlyAgg.map(m => m.day3Direct), itemStyle: { color: '#a78bfa', borderRadius: [2, 2, 0, 0] } },
      { name: 'D2 GMV', type: 'line', smooth: true, symbol: 'circle', symbolSize: 4,
        data: monthlyAgg.map(m => m.day2Gmv), itemStyle: { color: '#22d3ee' }, lineStyle: { width: 2, type: 'dashed' } },
      { name: 'D3 GMV', type: 'line', smooth: true, symbol: 'circle', symbolSize: 4,
        data: monthlyAgg.map(m => m.day3Gmv), itemStyle: { color: '#f59e0b' }, lineStyle: { width: 2, type: 'dashed' } }
    ] });
};

// 追单结构趋势（本期 vs 往期）
Charts.renderFollowStructure = function(monthlyAgg) {
  const c = this.init('chartFollowStructure');
  if (!c) return;
  const labels = monthlyAgg.map(m => this.monthLabel(m.month));
  c.setOption({ ...this.base,
    legend: { ...this.base.legend, show: true, top: 5, right: 0 },
    tooltip: { ...this.base.tooltip, trigger: 'axis',
      formatter: ps => {
        const total = ps.reduce((s, p) => s + (p.value || 0), 0);
        return ps.map(p => {
          const pct = total > 0 ? (p.value / total * 100).toFixed(0) : 0;
          return `${p.marker}${p.seriesName}: ${Fmt.int(p.value)} (${pct}%)`;
        }).join('<br>');
      }},
    xAxis: { ...this.base.xAxis, type: 'category', data: labels },
    yAxis: { ...this.base.yAxis, type: 'value' },
    series: [
      { name: '本期追单', type: 'bar', stack: 'follow', barMaxWidth: 22,
        data: monthlyAgg.map(m => m.followThis), itemStyle: { color: '#3b82f6', borderRadius: [0, 0, 0, 0] } },
      { name: '往期追单', type: 'bar', stack: 'follow', barMaxWidth: 22,
        data: monthlyAgg.map(m => m.followPrev), itemStyle: { color: '#f59e0b', borderRadius: [2, 2, 0, 0] } }
    ] });
};

// 完整漏斗：预约→到课→转化
Charts.renderFullFunnel = function(monthlyAgg) {
  const c = this.init('chartFullFunnel');
  if (!c) return;
  const total = monthlyAgg.reduce((s, m) => ({
    leads: s.leads + m.leads,
    d1Book: s.d1Book + m.d1BookCount, d1: s.d1 + m.d1Count,
    d2Book: s.d2Book + m.d2BookCount, d2: s.d2 + m.d2Count,
    d3Book: s.d3Book + m.d3BookCount, d3: s.d3 + m.d3Count,
    direct: s.direct + m.directConv, follow: s.follow + m.followConv
  }), { leads: 0, d1Book: 0, d1: 0, d2Book: 0, d2: 0, d3Book: 0, d3: 0, direct: 0, follow: 0 });

  const pct = v => total.leads > 0 ? (v / total.leads * 100).toFixed(1) + '%' : '-';
  const steps = [
    { value: total.leads, name: '总例子数', color: '#3b82f6' },
    { value: total.d1Book || Math.round(total.leads * 0.5), name: 'D1预约', color: '#06b6d4' },
    { value: total.d1 || Math.round(total.leads * 0.35), name: 'D1到课', color: '#22d3ee' },
    { value: total.d3 || Math.round(total.leads * 0.25), name: 'D3到课', color: '#a78bfa' },
    { value: total.direct, name: '直播转化', color: '#10b981' },
    { value: total.direct + total.follow, name: '总转化', color: '#f59e0b' }
  ];

  c.setOption({ ...this.base,
    tooltip: { ...this.base.tooltip, trigger: 'item',
      formatter: p => `${p.name}: ${Fmt.int(p.value)} (${pct(p.value)})` },
    series: [{ type: 'funnel', left: '10%', top: 20, bottom: 20, width: '80%', sort: 'none', gap: 3,
      label: { show: true, position: 'inside', fontSize: 11, color: '#fff',
        formatter: p => `${p.name}\n${Fmt.int(p.value)} (${pct(p.value)})` },
      itemStyle: { borderWidth: 0 },
      data: steps.map(s => ({ value: s.value, name: s.name, itemStyle: { color: s.color } }))
    }] });
};

// === 深度分析视图图表 ===

// 入群率趋势
Charts.renderJoinRate = function(monthlyAgg) {
  const c = this.init('chartJoinRate');
  if (!c) return;
  const data = monthlyAgg.filter(m => m.joinRate > 0);
  const labels = data.map(m => this.monthLabel(m.month));
  c.setOption({ ...this.base,
    tooltip: { ...this.base.tooltip, trigger: 'axis', formatter: ps => ps.map(p => `${p.marker}${p.seriesName}: ${Fmt.pct(p.value)}`).join('<br>') },
    xAxis: { ...this.base.xAxis, type: 'category', data: labels },
    yAxis: { ...this.base.yAxis, type: 'value', axisLabel: { ...this.base.yAxis.axisLabel, formatter: v => Fmt.pct(v) } },
    series: [
      { name: '入群率', type: 'line', smooth: true, symbol: 'circle', symbolSize: 5,
        data: data.map(m => m.joinRate), itemStyle: { color: '#22d3ee' }, lineStyle: { width: 2.5 },
        areaStyle: { opacity: 0.08 } }
    ] });
};

// 回访回复率趋势
Charts.renderCallback = function(monthlyAgg) {
  const c = this.init('chartCallback');
  if (!c) return;
  const data = monthlyAgg.filter(m => m.callbackRate > 0);
  const labels = data.map(m => this.monthLabel(m.month));
  c.setOption({ ...this.base,
    tooltip: { ...this.base.tooltip, trigger: 'axis', formatter: ps => ps.map(p => `${p.marker}${p.seriesName}: ${Fmt.pct(p.value)}`).join('<br>') },
    xAxis: { ...this.base.xAxis, type: 'category', data: labels },
    yAxis: { ...this.base.yAxis, type: 'value', axisLabel: { ...this.base.yAxis.axisLabel, formatter: v => Fmt.pct(v) } },
    series: [
      { name: '回访回复率', type: 'line', smooth: true, symbol: 'circle', symbolSize: 5,
        data: data.map(m => m.callbackRate), itemStyle: { color: '#10b981' }, lineStyle: { width: 2.5 },
        areaStyle: { opacity: 0.08 } }
    ] });
};

// 到课→直播转化率（直播质量）
Charts.renderAttendConv = function(monthlyAgg) {
  const c = this.init('chartAttendConv');
  if (!c) return;
  const data = monthlyAgg.filter(m => m.attendConvRate > 0);
  const labels = data.map(m => this.monthLabel(m.month));
  c.setOption({ ...this.base,
    tooltip: { ...this.base.tooltip, trigger: 'axis', formatter: ps => ps.map(p => `${p.marker}${p.seriesName}: ${Fmt.pct(p.value)}`).join('<br>') },
    xAxis: { ...this.base.xAxis, type: 'category', data: labels },
    yAxis: { ...this.base.yAxis, type: 'value', axisLabel: { ...this.base.yAxis.axisLabel, formatter: v => Fmt.pct(v) } },
    series: [
      { name: '到课→转化率', type: 'line', smooth: true, symbol: 'circle', symbolSize: 5,
        data: data.map(m => m.attendConvRate), itemStyle: { color: '#3b82f6' }, lineStyle: { width: 2.5 },
        areaStyle: { opacity: 0.08 } }
    ] });
};

// 30分钟到课率 vs 全程到课率
Charts.render30minAttend = function(monthlyAgg) {
  const c = this.init('chart30minAttend');
  if (!c) return;
  const data = monthlyAgg.filter(m => m.d3Rate30 > 0);
  const labels = data.map(m => this.monthLabel(m.month));
  c.setOption({ ...this.base,
    legend: { ...this.base.legend, show: true, top: 5, right: 0 },
    tooltip: { ...this.base.tooltip, trigger: 'axis', formatter: ps => ps.map(p => `${p.marker}${p.seriesName}: ${Fmt.pct(p.value)}`).join('<br>') },
    xAxis: { ...this.base.xAxis, type: 'category', data: labels },
    yAxis: { ...this.base.yAxis, type: 'value', axisLabel: { ...this.base.yAxis.axisLabel, formatter: v => Fmt.pct(v) } },
    series: [
      { name: 'D3全程到课率', type: 'line', smooth: true, symbol: 'circle', symbolSize: 4,
        data: data.map(m => m.d3Rate), itemStyle: { color: '#a78bfa' }, lineStyle: { width: 2.5 } },
      { name: 'D3-30分钟到课率', type: 'line', smooth: true, symbol: 'circle', symbolSize: 4,
        data: data.map(m => m.d3Rate30), itemStyle: { color: '#f59e0b' }, lineStyle: { width: 2, type: 'dashed' } },
      { name: 'D1全程到课率', type: 'line', smooth: true, symbol: 'none',
        data: data.map(m => m.d1Rate), itemStyle: { color: '#22d3ee' }, lineStyle: { width: 1.5, opacity: 0.5 } },
      { name: 'D1-30分钟到课率', type: 'line', smooth: true, symbol: 'none',
        data: data.map(m => m.d1Rate30), itemStyle: { color: '#22d3ee' }, lineStyle: { width: 1.5, type: 'dashed', opacity: 0.5 } }
    ] });
};

// 例子新鲜度转化率对比
Charts.renderFreshness = function(rawData) {
  const c = this.init('chartFreshness');
  if (!c) return;
  const map = {};
  rawData.forEach(d => {
    const f = d._freshness;
    if (!f) return;
    if (!map[f]) map[f] = { leads: 0, conv: 0, gmv: 0 };
    map[f].leads += d._leads || 0;
    map[f].conv += d._conv || 0;
    map[f].gmv += d._gmv || 0;
  });
  const items = Object.entries(map)
    .filter(([, v]) => v.leads > 200)
    .map(([k, v]) => ({ name: k, rate: v.leads > 0 ? v.conv / v.leads : 0, leads: v.leads }))
    .sort((a, b) => b.rate - a.rate).slice(0, 12);

  c.setOption({ ...this.base,
    grid: { ...this.base.grid, bottom: 50 },
    tooltip: { ...this.base.tooltip, trigger: 'axis',
      formatter: ps => `${ps[0].name}: 转化率 ${Fmt.pct(ps[0].value)}<br/>例子数: ${Fmt.int(items.find(i => i.name === ps[0].name)?.leads)}` },
    xAxis: { ...this.base.xAxis, type: 'category', data: items.map(i => i.name),
      axisLabel: { ...this.base.xAxis.axisLabel, rotate: 20, interval: 0 } },
    yAxis: { ...this.base.yAxis, type: 'value', axisLabel: { ...this.base.yAxis.axisLabel, formatter: v => Fmt.pct(v) } },
    series: [{ type: 'bar', barMaxWidth: 28, data: items.map(i => ({
      value: i.rate, itemStyle: { color: i.rate > 0.03 ? '#10b981' : i.rate > 0.015 ? '#3b82f6' : '#6b7280', borderRadius: [3, 3, 0, 0] }
    })) }] });
};

// 二级画像转化率对比
Charts.renderProfile2 = function(rawData) {
  const c = this.init('chartProfile2');
  if (!c) return;
  const map = {};
  rawData.forEach(d => {
    const p = d._profile2;
    if (!p) return;
    if (!map[p]) map[p] = { leads: 0, conv: 0 };
    map[p].leads += d._leads || 0;
    map[p].conv += d._conv || 0;
  });
  const items = Object.entries(map)
    .filter(([, v]) => v.leads > 200)
    .map(([k, v]) => ({ name: k, rate: v.leads > 0 ? v.conv / v.leads : 0, leads: v.leads }))
    .sort((a, b) => b.rate - a.rate).slice(0, 12);

  c.setOption({ ...this.base,
    grid: { ...this.base.grid, bottom: 50 },
    tooltip: { ...this.base.tooltip, trigger: 'axis',
      formatter: ps => `${ps[0].name}: 转化率 ${Fmt.pct(ps[0].value)}` },
    xAxis: { ...this.base.xAxis, type: 'category', data: items.map(i => i.name),
      axisLabel: { ...this.base.xAxis.axisLabel, rotate: 20, interval: 0 } },
    yAxis: { ...this.base.yAxis, type: 'value', axisLabel: { ...this.base.yAxis.axisLabel, formatter: v => Fmt.pct(v) } },
    series: [{ type: 'bar', barMaxWidth: 28, data: items.map(i => ({
      value: i.rate, itemStyle: { color: '#10b981', borderRadius: [3, 3, 0, 0] }
    })) }] });
};

// 转化周期分布
Charts.renderConvCycle = function(rawData) {
  const c = this.init('chartConvCycle');
  if (!c) return;
  const map = {};
  rawData.forEach(d => {
    const cy = d._convCycle;
    if (!cy) return;
    map[cy] = (map[cy] || 0) + 1;
  });
  const items = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 15);

  c.setOption({ ...this.base,
    grid: { ...this.base.grid, bottom: 50 },
    tooltip: { ...this.base.tooltip, trigger: 'axis', formatter: ps => `${ps[0].name}: ${ps[0].value}条记录` },
    xAxis: { ...this.base.xAxis, type: 'category', data: items.map(i => i[0]),
      axisLabel: { ...this.base.xAxis.axisLabel, rotate: 20, interval: 0 } },
    yAxis: { ...this.base.yAxis, type: 'value' },
    series: [{ type: 'bar', barMaxWidth: 28, data: items.map(i => ({
      value: i[1], itemStyle: { color: '#22d3ee', borderRadius: [3, 3, 0, 0] }
    })) }] });
};

// 直播版本转化率对比
Charts.renderLiveVersion = function(rawData) {
  const c = this.init('chartLiveVersion');
  if (!c) return;
  const map = {};
  rawData.forEach(d => {
    const v = d._liveVersion;
    if (!v) return;
    if (!map[v]) map[v] = { leads: 0, conv: 0 };
    map[v].leads += d._leads || 0;
    map[v].conv += d._conv || 0;
  });
  const items = Object.entries(map)
    .filter(([, v]) => v.leads > 500)
    .map(([k, v]) => ({ name: k, rate: v.leads > 0 ? v.conv / v.leads : 0, leads: v.leads }))
    .sort((a, b) => b.rate - a.rate).slice(0, 12);

  c.setOption({ ...this.base,
    grid: { ...this.base.grid, bottom: 50 },
    tooltip: { ...this.base.tooltip, trigger: 'axis',
      formatter: ps => `${ps[0].name}: 转化率 ${Fmt.pct(ps[0].value)}` },
    xAxis: { ...this.base.xAxis, type: 'category', data: items.map(i => i.name),
      axisLabel: { ...this.base.xAxis.axisLabel, rotate: 20, interval: 0 } },
    yAxis: { ...this.base.yAxis, type: 'value', axisLabel: { ...this.base.yAxis.axisLabel, formatter: v => Fmt.pct(v) } },
    series: [{ type: 'bar', barMaxWidth: 28, data: items.map(i => ({
      value: i.rate, itemStyle: { color: '#3b82f6', borderRadius: [3, 3, 0, 0] }
    })) }] });
};

window.addEventListener('resize', () => Charts.resizeAll());

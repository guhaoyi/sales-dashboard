/**
 * 智能分析引擎
 * 根据筛选后的数据自动生成分析洞察
 */
const Analysis = {
  generate(monthlyAgg, rawData) {
    const items = [];
    if (!monthlyAgg || monthlyAgg.length < 2) {
      items.push({ type: 'info', label: '数据不足', text: '当前筛选条件下数据不足两个月，无法生成趋势分析。请扩大时间范围。' });
      return items;
    }

    items.push(this._gmvTrend(monthlyAgg));
    items.push(this._conversionRate(monthlyAgg));
    items.push(...this._anomalies(monthlyAgg));
    items.push(this._skuComparison(rawData));
    items.push(this._attendance(monthlyAgg));
    items.push(this._refund(monthlyAgg));
    items.push(this._followStructure(monthlyAgg));
    items.push(this._joinAndCallback(monthlyAgg));

    return items.filter(Boolean);
  },

  _gmvTrend(months) {
    const last = months[months.length - 1];
    const prev = months[months.length - 2];
    const chg = prev.gmv > 0 ? ((last.gmv - prev.gmv) / prev.gmv * 100) : 0;
    const mo = this._monthLabel(last.month);
    const prevMo = this._monthLabel(prev.month);

    let verdict = '';
    if (chg > 20) verdict = '增长强劲，保持当前策略。';
    else if (chg > 5) verdict = '稳步增长，势头良好。';
    else if (chg > -5) verdict = '基本持平，可关注增长点。';
    else if (chg > -20) verdict = '小幅回落，建议排查原因。';
    else verdict = '下降明显，需重点关注并制定应对方案。';

    // 整体趋势判断
    const firstHalf = months.slice(0, Math.floor(months.length / 2));
    const secondHalf = months.slice(Math.floor(months.length / 2));
    const avgFirst = firstHalf.reduce((s, m) => s + m.gmv, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((s, m) => s + m.gmv, 0) / secondHalf.length;
    const overallTrend = avgSecond > avgFirst * 1.1 ? '整体呈上升趋势' : avgSecond < avgFirst * 0.9 ? '整体呈下降趋势' : '整体保持平稳';

    return {
      type: chg >= 0 ? 'good' : (chg > -15 ? 'warn' : 'bad'),
      label: 'GMV 趋势',
      text: `${mo} GMV <strong>${Fmt.money(last.gmv)}</strong>，环比${prevMo}${chg >= 0 ? '增长' : '下降'} <strong>${Math.abs(chg).toFixed(1)}%</strong>。${overallTrend}。${verdict}`
    };
  },

  _conversionRate(months) {
    const best = months.reduce((a, b) => a.totalRate > b.totalRate ? a : b);
    const worst = months.reduce((a, b) => (a.totalRate > 0 && a.totalRate < b.totalRate) || b.totalRate === 0 ? a : b);
    const totalDirect = months.reduce((s, m) => s + m.directConv, 0);
    const totalFollow = months.reduce((s, m) => s + m.followConv, 0);
    const totalConv = totalDirect + totalFollow;
    const directPct = totalConv > 0 ? (totalDirect / totalConv * 100).toFixed(0) : 0;
    const followPct = totalConv > 0 ? (totalFollow / totalConv * 100).toFixed(0) : 0;

    const last = months[months.length - 1];
    const avg = months.reduce((s, m) => s + m.totalRate, 0) / months.length;
    const vsAvg = last.totalRate > avg ? '高于' : '低于';

    return {
      type: 'info',
      label: '转化率分析',
      text: `转化率最高：<strong>${this._monthLabel(best.month)} (${Fmt.pct(best.totalRate)})</strong>，最低：<strong>${this._monthLabel(worst.month)} (${Fmt.pct(worst.totalRate)})</strong>。直播转化贡献 <strong>${directPct}%</strong>，追单贡献 <strong>${followPct}%</strong>。当前月转化率${vsAvg}均值。`
    };
  },

  _anomalies(months) {
    const items = [];
    const anomalies = [];
    for (let i = 1; i < months.length; i++) {
      if (months[i - 1].totalRate === 0) continue;
      const rateChg = (months[i].totalRate - months[i - 1].totalRate) / months[i - 1].totalRate;
      if (Math.abs(rateChg) > 0.3) {
        anomalies.push({
          month: this._monthLabel(months[i].month),
          chg: rateChg,
          direction: rateChg > 0 ? '上升' : '下降'
        });
      }
    }

    // GMV 异常
    const gmvAnomalies = [];
    for (let i = 1; i < months.length; i++) {
      if (months[i - 1].gmv === 0) continue;
      const gmvChg = (months[i].gmv - months[i - 1].gmv) / months[i - 1].gmv;
      if (Math.abs(gmvChg) > 0.5) {
        gmvAnomalies.push({
          month: this._monthLabel(months[i].month),
          chg: gmvChg,
          direction: gmvChg > 0 ? '暴增' : '骤降'
        });
      }
    }

    if (anomalies.length > 0) {
      items.push({
        type: 'warn',
        label: '转化率异常',
        text: `发现 <strong>${anomalies.length}</strong> 处转化率异常波动：${anomalies.map(a => `${a.month}${a.direction}${Math.abs(a.chg * 100).toFixed(0)}%`).join('、')}。建议检查对应月份的例子质量、直播策略或渠道变化。`
      });
    } else {
      items.push({
        type: 'good',
        label: '异常检测',
        text: '所选时间段内转化率走势平稳，未发现超过30%的异常波动。'
      });
    }

    if (gmvAnomalies.length > 0) {
      items.push({
        type: 'warn',
        label: 'GMV 异常',
        text: `GMV 大幅波动：${gmvAnomalies.map(a => `${a.month}${a.direction}${Math.abs(a.chg * 100).toFixed(0)}%`).join('、')}。可能与例子数量变化或大促活动有关。`
      });
    }

    return items;
  },

  _skuComparison(rawData) {
    const skuMap = {};
    rawData.forEach(d => {
      const sku = d['SKU'] || d['sku'];
      if (!sku) return;
      if (!skuMap[sku]) skuMap[sku] = { gmv: 0, leads: 0, conv: 0 };
      const gmv = this._num(d['总GMV（未退）']) || this._num(d['总GMV(除退款+含往期)']) || 0;
      const leads = this._num(d['例子数']) || 0;
      const conv = this._num(d['总转数（包含退单）']) || this._num(d['总转数（减去退单）']) || 0;
      skuMap[sku].gmv += gmv;
      skuMap[sku].leads += leads;
      skuMap[sku].conv += conv;
    });

    const skus = Object.entries(skuMap).filter(([, v]) => v.gmv > 0).sort((a, b) => b[1].gmv - a[1].gmv);
    if (skus.length === 0) return null;

    const totalGmv = skus.reduce((s, [, v]) => s + v.gmv, 0);
    const top = skus[0];
    const share = (top[1].gmv / totalGmv * 100).toFixed(0);

    const details = skus.map(([name, v]) => {
      const rate = v.leads > 0 ? Fmt.pct(v.conv / v.leads) : '-';
      return `${name} GMV ${Fmt.money(v.gmv)}(转化率${rate})`;
    }).join('，');

    return {
      type: 'info',
      label: 'SKU 对比',
      text: `<strong>${top[0]}</strong> 贡献 GMV 占比 <strong>${share}%</strong>，是核心营收来源。${details}。`
    };
  },

  _attendance(months) {
    const last = months[months.length - 1];
    const prev = months[months.length - 2];
    const d3Chg = last.d3Rate - prev.d3Rate;
    const mo = this._monthLabel(last.month);

    // 到课率与转化率相关性
    const highAttend = months.filter(m => m.d3Rate > 0.25);
    const lowAttend = months.filter(m => m.d3Rate > 0 && m.d3Rate <= 0.25);
    let correlation = '';
    if (highAttend.length > 0 && lowAttend.length > 0) {
      const highConv = highAttend.reduce((s, m) => s + m.totalRate, 0) / highAttend.length;
      const lowConv = lowAttend.reduce((s, m) => s + m.totalRate, 0) / lowAttend.length;
      if (highConv > lowConv * 1.2) {
        correlation = '高到课率月份的转化率明显更高，到课率是转化的关键驱动因素。';
      }
    }

    return {
      type: d3Chg >= 0 ? 'good' : 'warn',
      label: '到课率趋势',
      text: `${mo} D3到课率 <strong>${Fmt.pct(last.d3Rate)}</strong>，环比${d3Chg >= 0 ? '提升' : '下降'} <strong>${Math.abs(d3Chg * 100).toFixed(2)}pp</strong>。${correlation}${d3Chg < -0.02 ? '到课率下降需重点关注社群活跃度和开课提醒。' : ''}`
    };
  },

  _refund(months) {
    const withRefund = months.filter(m => m.refundRate > 0);
    if (withRefund.length === 0) return { type: 'info', label: '退款分析', text: '当前数据中无退款率信息。' };

    const avgRefund = withRefund.reduce((s, m) => s + m.refundRate, 0) / withRefund.length;
    const maxRefund = withRefund.reduce((a, b) => a.refundRate > b.refundRate ? a : b);
    const last = months[months.length - 1];
    const totalRefundGmv = months.reduce((s, m) => s + (m.refundGmv || 0), 0);

    // 退款率环比
    const prev = months.length >= 2 ? months[months.length - 2] : null;
    let refundTrend = '';
    if (prev && prev.refundRate > 0) {
      const chg = ((last.refundRate - prev.refundRate) / prev.refundRate * 100);
      if (Math.abs(chg) > 50) refundTrend = `环比${chg > 0 ? '上升' : '下降'} <strong>${Math.abs(chg).toFixed(0)}%</strong>，波动较大。`;
    }

    return {
      type: last.refundRate > avgRefund * 1.5 ? 'bad' : (last.refundRate > avgRefund ? 'warn' : 'good'),
      label: '退款分析',
      text: `平均开营前退款率 <strong>${Fmt.pct(avgRefund)}</strong>，最高出现在 <strong>${this._monthLabel(maxRefund.month)} (${Fmt.pct(maxRefund.refundRate)})</strong>。累计退款GMV <strong>${Fmt.money(totalRefundGmv)}</strong>。${refundTrend}${last.refundRate > avgRefund * 1.5 ? '当前月退款率偏高，需关注产品质量和用户预期管理。' : '退款率在正常范围内。'}`
    };
  },

  _followStructure(months) {
    const withFollow = months.filter(m => m.followThis > 0 || m.followPrev > 0);
    if (withFollow.length < 2) return null;

    const totalThis = withFollow.reduce((s, m) => s + m.followThis, 0);
    const totalPrev = withFollow.reduce((s, m) => s + m.followPrev, 0);
    const total = totalThis + totalPrev;
    if (total === 0) return null;

    const thisPct = (totalThis / total * 100).toFixed(0);
    const prevPct = (totalPrev / total * 100).toFixed(0);

    const last = withFollow[withFollow.length - 1];
    const lastTotal = last.followThis + last.followPrev;
    const lastPrevPct = lastTotal > 0 ? (last.followPrev / lastTotal * 100).toFixed(0) : 0;

    return {
      type: lastPrevPct > 40 ? 'warn' : 'info',
      label: '追单结构',
      text: `本期追单占 <strong>${thisPct}%</strong>，往期追单占 <strong>${prevPct}%</strong>。最近月份往期追单占比 <strong>${lastPrevPct}%</strong>。${lastPrevPct > 40 ? '往期追单占比偏高，说明当期转化力度不足，需加强直播间即时转化。' : '追单结构健康，以本期追单为主。'}`
    };
  },

  _joinAndCallback(months) {
    const withJoin = months.filter(m => m.joinRate > 0);
    const withCallback = months.filter(m => m.callbackRate > 0);

    const parts = [];
    if (withJoin.length >= 2) {
      const avgJoin = withJoin.reduce((s, m) => s + m.joinRate, 0) / withJoin.length;
      const last = withJoin[withJoin.length - 1];
      parts.push(`入群率均值 <strong>${Fmt.pct(avgJoin)}</strong>，最近 <strong>${Fmt.pct(last.joinRate)}</strong>${last.joinRate < avgJoin * 0.8 ? '（偏低，需关注）' : ''}`);
    }
    if (withCallback.length >= 2) {
      const avgCb = withCallback.reduce((s, m) => s + m.callbackRate, 0) / withCallback.length;
      const last = withCallback[withCallback.length - 1];
      parts.push(`回访回复率均值 <strong>${Fmt.pct(avgCb)}</strong>，最近 <strong>${Fmt.pct(last.callbackRate)}</strong>`);
    }

    if (parts.length === 0) return null;
    return { type: 'info', label: '入群 & 回访', text: parts.join('。') + '。' };
  },

  _monthLabel(m) {
    if (!m) return '-';
    const parts = m.match(/(\d{4})-(\d{1,2})/);
    if (!parts) return m;
    return parts[1].slice(2) + '年' + parseInt(parts[2]) + '月';
  },

  _num(v) {
    if (v == null) return 0;
    if (typeof v === 'number') return v;
    if (typeof v === 'object' && v.value) return Array.isArray(v.value) ? v.value[0] || 0 : v.value;
    return parseFloat(v) || 0;
  }
};

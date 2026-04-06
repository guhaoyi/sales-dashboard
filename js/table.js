/**
 * 通用表格组件
 * 支持排序、搜索、分页
 */
class DataTable {
  constructor(opts) {
    this.tableEl = document.querySelector(`#${opts.tableId}`);
    this.pageInfoEl = document.getElementById(opts.pageInfoId);
    this.pageBtnsEl = document.getElementById(opts.pageBtnsId);
    this.searchEl = opts.searchId ? document.getElementById(opts.searchId) : null;
    this.columns = opts.columns; // [{key, label, fmt?, width?}]
    this.pageSize = opts.pageSize || 100;
    this.data = [];
    this.filtered = [];
    this.sortKey = opts.defaultSort || null;
    this.sortAsc = false;
    this.page = 0;
    this.extraFilter = null; // external filter function

    this._renderHead();
    if (this.searchEl) {
      this.searchEl.addEventListener('input', () => { this.page = 0; this._applyFilter(); this._render(); });
    }
  }

  setData(data) {
    this.data = data;
    this.page = 0;
    this._applyFilter();
    this._render();
  }

  setExtraFilter(fn) {
    this.extraFilter = fn;
    this.page = 0;
    this._applyFilter();
    this._render();
  }

  _applyFilter() {
    let d = this.data;
    if (this.extraFilter) d = d.filter(this.extraFilter);
    if (this.searchEl && this.searchEl.value.trim()) {
      const q = this.searchEl.value.trim().toLowerCase();
      d = d.filter(row => this.columns.some(c => {
        const v = row[c.key];
        return v !== null && v !== undefined && String(v).toLowerCase().includes(q);
      }));
    }
    this.filtered = d;
  }

  _renderHead() {
    const tr = this.tableEl.querySelector('thead tr');
    tr.innerHTML = this.columns.map(c =>
      `<th data-key="${c.key}" style="${c.width ? 'width:' + c.width : ''}">${c.label}</th>`
    ).join('');
    tr.querySelectorAll('th').forEach(th => {
      th.addEventListener('click', () => {
        const k = th.dataset.key;
        if (this.sortKey === k) this.sortAsc = !this.sortAsc;
        else { this.sortKey = k; this.sortAsc = true; }
        this.page = 0;
        this._render();
      });
    });
  }

  _render() {
    let d = [...this.filtered];

    // Sort
    if (this.sortKey) {
      d.sort((a, b) => {
        let va = a[this.sortKey], vb = b[this.sortKey];
        if (va == null) va = '';
        if (vb == null) vb = '';
        if (typeof va === 'number' && typeof vb === 'number') return this.sortAsc ? va - vb : vb - va;
        return this.sortAsc ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
      });
    }

    // Update sort indicators
    this.tableEl.querySelectorAll('th').forEach(th => {
      th.classList.remove('sorted-asc', 'sorted-desc');
      if (th.dataset.key === this.sortKey) th.classList.add(this.sortAsc ? 'sorted-asc' : 'sorted-desc');
    });

    // Paginate
    const totalPages = Math.max(1, Math.ceil(d.length / this.pageSize));
    if (this.page >= totalPages) this.page = totalPages - 1;
    const start = this.page * this.pageSize;
    const pageData = d.slice(start, start + this.pageSize);

    // Render body
    const tbody = this.tableEl.querySelector('tbody');
    tbody.innerHTML = pageData.map(row =>
      '<tr>' + this.columns.map(c => {
        const v = row[c.key];
        const display = c.fmt ? c.fmt(v, row) : (v != null ? v : '-');
        return `<td>${display}</td>`;
      }).join('') + '</tr>'
    ).join('');

    // Page info
    if (this.pageInfoEl) {
      this.pageInfoEl.textContent = `共 ${d.length} 条，第 ${this.page + 1}/${totalPages} 页`;
    }

    // Page buttons
    if (this.pageBtnsEl) {
      this.pageBtnsEl.innerHTML = `
        <button class="page-btn" ${this.page <= 0 ? 'disabled' : ''} data-p="0">首页</button>
        <button class="page-btn" ${this.page <= 0 ? 'disabled' : ''} data-p="${this.page - 1}">上一页</button>
        <button class="page-btn" ${this.page >= totalPages - 1 ? 'disabled' : ''} data-p="${this.page + 1}">下一页</button>
        <button class="page-btn" ${this.page >= totalPages - 1 ? 'disabled' : ''} data-p="${totalPages - 1}">末页</button>
      `;
      this.pageBtnsEl.querySelectorAll('.page-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          if (btn.disabled) return;
          this.page = parseInt(btn.dataset.p);
          this._render();
        });
      });
    }
  }
}

// --- 格式化工具 ---
const Fmt = {
  num: v => v == null ? '-' : Number(v).toLocaleString('zh-CN'),
  int: v => v == null ? '-' : Math.round(Number(v)).toLocaleString('zh-CN'),
  pct: v => v == null ? '-' : (Number(v) * 100).toFixed(2) + '%',
  pct1: v => v == null ? '-' : (Number(v) * 100).toFixed(1) + '%',
  money: v => {
    if (v == null) return '-';
    v = Number(v);
    if (v >= 100000000) return (v / 100000000).toFixed(2) + '亿';
    if (v >= 10000) return (v / 10000).toFixed(1) + '万';
    return v.toLocaleString('zh-CN');
  },
  moneyFull: v => v == null ? '-' : '¥' + Number(v).toLocaleString('zh-CN'),
  yuan: v => v == null ? '-' : '¥' + Number(v).toFixed(1),
  date: v => {
    if (!v) return '-';
    if (typeof v === 'number') {
      const d = new Date(v);
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }
    return v;
  },
  sku: v => {
    if (!v) return '-';
    const cls = v.includes('学霸') ? 'xb' : v.includes('阅读') ? 'yd' : v.includes('自拼') ? 'zp' : '';
    return `<span class="sku-tag ${cls}">${v}</span>`;
  },
  status: v => {
    if (!v) return '-';
    const cls = v === '同意' ? 'approved' : (v === '拒绝' ? 'rejected' : 'pending');
    return `<span class="status-tag ${cls}">${v}</span>`;
  }
};

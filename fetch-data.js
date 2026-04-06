#!/usr/bin/env node
/**
 * 私域销转数据看板 — 飞书数据拉取脚本
 * 从飞书多维表格拉取全量数据，清洗后存为本地 JSON
 * 
 * 用法: node fetch-data.js
 */

const fs = require('fs');
const path = require('path');

// --- 配置 ---
const APP_TOKEN = 'UK1ab6Sypag0qFs3NYNcHizon4b';
const DATA_DIR = path.join(__dirname, 'data');
const CONFIG_PATH = path.join(process.env.HOME, '.openclaw/openclaw.json');

const TABLES = [
  { id: 'tblisfypGqzVkrdK', name: '转化数据总表', file: 'conversion.json', fields: null }, // null = 全部字段
  { id: 'tbl74KR7ZdbdlUYP', name: '销售报单表', file: 'orders.json', fields: null },
  { id: 'tblQtlbWck1vKW2K', name: '分区运营表', file: 'weekly-ops.json', fields: null },
  { id: 'tblOwJELNv1SvEqt', name: '成员联系统计', file: 'member-contact.json', fields: null },
  { id: 'tbl69FKxeP6DifdX', name: '成员服务统计', file: 'member-service.json', fields: null },
];

const PAGE_SIZE = 500;

// --- 飞书 API ---
async function getToken() {
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  const feishu = config.channels.feishu;
  const resp = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: feishu.appId, app_secret: feishu.appSecret })
  });
  const data = await resp.json();
  if (!data.tenant_access_token) throw new Error('获取 token 失败: ' + JSON.stringify(data));
  return data.tenant_access_token;
}

async function fetchAllRecords(token, tableId, fieldNames) {
  const records = [];
  let pageToken = null;
  let page = 0;

  while (true) {
    page++;
    const params = new URLSearchParams({ page_size: PAGE_SIZE });
    if (pageToken) params.set('page_token', pageToken);

    const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${APP_TOKEN}/tables/${tableId}/records?${params}`;
    const resp = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await resp.json();

    if (data.code !== 0) throw new Error(`API 错误 (table=${tableId}): code=${data.code}, msg=${data.msg}`);

    const items = data.data.items || [];
    records.push(...items);

    process.stdout.write(`  第${page}页: +${items.length}条 (累计${records.length}/${data.data.total || '?'})\r`);

    if (!data.data.has_more) break;
    pageToken = data.data.page_token;

    // 避免触发限流
    await sleep(200);
  }

  console.log(`  完成: ${records.length}条记录`);
  return records;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// --- 数据清洗 ---
function cleanValue(val) {
  if (val === null || val === undefined) return null;

  // Formula / Lookup: {type: 2, value: [xxx]}
  if (typeof val === 'object' && !Array.isArray(val) && val.type !== undefined && val.value !== undefined) {
    if (Array.isArray(val.value) && val.value.length === 1) return cleanValue(val.value[0]);
    if (Array.isArray(val.value)) return val.value.map(cleanValue);
    return val.value;
  }

  // Text array: [{text: "xxx", type: "text"}]
  if (Array.isArray(val) && val.length > 0 && val[0] && val[0].type === 'text') {
    return val.map(v => v.text).join('');
  }

  // Link record: {link_record_ids: [...]}
  if (typeof val === 'object' && !Array.isArray(val) && val.link_record_ids !== undefined) {
    return val.link_record_ids;
  }

  // Person field: [{id: "ou_xxx", name: "xxx"}]
  if (Array.isArray(val) && val.length > 0 && val[0] && val[0].id && val[0].name) {
    return val.map(v => v.name).join(', ');
  }

  return val;
}

function cleanRecord(record) {
  const cleaned = { _id: record.record_id };
  for (const [key, val] of Object.entries(record.fields || {})) {
    cleaned[key] = cleanValue(val);
  }
  return cleaned;
}

// --- 主流程 ---
async function main() {
  console.log('=== 私域销转数据拉取 ===\n');

  // 确保 data 目录存在
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  // 获取 token
  console.log('1. 获取飞书 access token...');
  const token = await getToken();
  console.log('   ✓ Token 获取成功\n');

  // 拉取各表数据
  const meta = { updatedAt: new Date().toISOString(), tables: {} };

  for (let i = 0; i < TABLES.length; i++) {
    const t = TABLES[i];
    console.log(`2.${i + 1} 拉取「${t.name}」(${t.id})...`);

    const raw = await fetchAllRecords(token, t.id, t.fields);
    const cleaned = raw.map(cleanRecord);

    // 写入文件
    const filePath = path.join(DATA_DIR, t.file);
    fs.writeFileSync(filePath, JSON.stringify(cleaned, null, 0)); // 不缩进，节省空间
    const size = (fs.statSync(filePath).size / 1024).toFixed(1);
    console.log(`   ✓ 写入 ${t.file} (${size}KB, ${cleaned.length}条)\n`);

    meta.tables[t.name] = { file: t.file, count: cleaned.length, sizeKB: parseFloat(size) };

    // 表间间隔
    if (i < TABLES.length - 1) await sleep(500);
  }

  // 写入 meta
  fs.writeFileSync(path.join(DATA_DIR, 'meta.json'), JSON.stringify(meta, null, 2));
  console.log('3. 写入 meta.json ✓\n');

  // 汇总
  console.log('=== 完成 ===');
  console.log(`数据目录: ${DATA_DIR}`);
  console.log(`更新时间: ${meta.updatedAt}`);
  for (const [name, info] of Object.entries(meta.tables)) {
    console.log(`  ${name}: ${info.count}条 (${info.sizeKB}KB)`);
  }
}

main().catch(err => {
  console.error('\n❌ 错误:', err.message);
  process.exit(1);
});

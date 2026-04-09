import json, os

# conversion.json: only keep fields actually used in app.js
CONV_FIELDS = [
    '_id', '月度', '期数', 'SKU', '城市', '例子画像', '组长', '运营负责人', '分区负责人', '主R',
    '例子数', '总转数（减去退单）', '总转数（包含退单）', '直播转化数', '总追单数',
    '总GMV（未退）', '总GMV(除退款+含往期)', '总GMV(除退款+不含往期)',
    'DAY1到课率', 'DAY2到课率', 'DAY3到课率', 'DAY3到课数',
    '直播间转化率', '【总转率（含退单）】', '【总转率除退款+含往期】', '【直转率】',
    'ARPU（剔除退款）', '【ARPU】',
    '退单数（开营前）', '学霸-退单数（开营前）', '退款GMV', '退款率（开营前）', '直转退单数', '单价',
    'DAY2-GMV', 'DAY3-GMV', 'DAY2直转数', 'DAY3直转数', 'DAY2直转率', 'DAY3直转率',
    'DAY1预约数', 'DAY2预约数', 'DAY3预约数', 'DAY1预约率', 'DAY2预约率', 'DAY3预约率',
    '本期追单数', '本期追单GMV', '本期追单率', '往期追单数', '往期追单GMV', '往期追单率', '追单占比',
    '入群数', '入群率', '回访回复数', '回访回复率', '到课-直播转化率',
    'D1-30分钟到课率', 'D2-30分钟到课率', 'D3-30分钟到课率',
    '例子新鲜度', '例子画像二级', '转化周期', '大课直播版本'
]

# orders.json: only keep fields used
ORDER_FIELDS = [
    '_id', 'sku', 'SKU', '创建时间', '期数', '推广员姓名', '审批状态',
    '组长', '分区负责人', '例子画像', '审批备注'
]

def slim(infile, outfile, keep_fields):
    with open(infile) as f:
        data = json.load(f)
    keep = set(keep_fields)
    slimmed = [{k: v for k, v in rec.items() if k in keep} for rec in data]
    with open(outfile, 'w') as f:
        json.dump(slimmed, f, ensure_ascii=False, separators=(',', ':'))
    orig = os.path.getsize(infile)
    new = os.path.getsize(outfile)
    print(f'{infile}: {orig/1024/1024:.1f}MB -> {new/1024/1024:.1f}MB ({100-new/orig*100:.0f}% smaller)')

slim('data/conversion.json', 'data/conversion.json.tmp', CONV_FIELDS)
slim('data/orders.json', 'data/orders.json.tmp', ORDER_FIELDS)

# Replace originals
os.replace('data/conversion.json.tmp', 'data/conversion.json')
os.replace('data/orders.json.tmp', 'data/orders.json')

# Also show final totals
total = sum(os.path.getsize(f'data/{f}') for f in os.listdir('data') if f.endswith('.json'))
print(f'\nTotal data/: {total/1024/1024:.1f}MB')

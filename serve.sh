#!/bin/bash
cd "$(dirname "$0")"
echo "🚀 私域销转数据看板"
echo "   地址: http://localhost:8891"
echo "   按 Ctrl+C 停止"
echo ""
python3 -m http.server 8891

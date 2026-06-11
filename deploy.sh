#!/bin/bash
# ============================================
# 🚀 Newsbot GAS 一鍵部署腳本
# 用法: ./deploy.sh "版本描述"
# ============================================

# 部署 ID：執行 `clasp deployments` 取得你自己的 ID 後填入（或設為環境變數 DEPLOY_ID）
DEPLOY_ID="${DEPLOY_ID:-YOUR_CLASP_DEPLOYMENT_ID}"

# 取得版本描述
if [ -n "$1" ]; then
  DESC="$1"
else
  read -p "📝 輸入版本描述: " DESC
  if [ -z "$DESC" ]; then
    echo "❌ 需要版本描述"
    exit 1
  fi
fi

echo ""
echo "🚀 開始部署: $DESC"
echo "================================"

# Step 1: clasp push
echo "📤 推送程式碼到 GAS..."
if ! clasp push --force; then
  echo "❌ clasp push 失敗"
  exit 1
fi

# Step 2: clasp deploy (原地更新，URL 不變)
echo ""
echo "🔄 更新正式版部署..."
if ! clasp deploy -i "$DEPLOY_ID" -d "$DESC"; then
  echo "❌ clasp deploy 失敗"
  exit 1
fi

# Step 3: 確認
echo ""
echo "✅ 部署完成！"
echo "================================"
clasp deployments

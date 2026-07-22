#!/bin/bash
# Google Cloud Run & Cloud Scheduler Deployment Script for PulseSite AutoAgency

set -e

PROJECT_ID="pulse-site-agency"
REGION="us-central1"
SERVICE_NAME="pulse-site"
CRON_JOB_NAME="daily-outreach-cron"

echo "=================================================="
echo "🚀 Google Cloud Console Deployment Suite"
echo "=================================================="

# 1. Set Active GCP Project
echo "[GCP] Setting project to $PROJECT_ID..."
gcloud config set project $PROJECT_ID || true

# 2. Enable Required Google Cloud APIs
echo "[GCP] Enabling Cloud Run & Cloud Scheduler APIs..."
gcloud services enable run.googleapis.com cloudbuild.googleapis.com cloudscheduler.googleapis.com

# 3. Deploy to Google Cloud Run
echo "[GCP] Building & deploying container to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --source . \
  --region $REGION \
  --allow-unauthenticated \
  --port 8080 \
  --set-env-vars "NODE_ENV=production,CRON_SECRET=pulsesite-gcp-cron-secret-2026,SUPABASE_URL=https://yakxilrzdbxhbyuddnjq.supabase.co,SUPABASE_KEY=sb_publishable_zNyWhFh6Qb7qCl8CHo7mNQ_0mnKL1s-,SUPABASE_SERVICE_ROLE_KEY=sb_publishable_zNyWhFh6Qb7qCl8CHo7mNQ_0mnKL1s-"

# 4. Get Cloud Run Service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region $REGION --format 'value(status.url)')
echo "[GCP] ✅ Cloud Run deployed successfully at: $SERVICE_URL"

# 5. Create Google Cloud Scheduler Cron Job (Daily 9:00 AM)
echo "[GCP] Configuring Cloud Scheduler for 9:00 AM daily outreach..."
gcloud scheduler jobs delete $CRON_JOB_NAME --location=$REGION --quiet || true

gcloud scheduler jobs create http $CRON_JOB_NAME \
  --location=$REGION \
  --schedule="0 9 * * *" \
  --time-zone="Asia/Kolkata" \
  --uri="$SERVICE_URL/api/cron/daily-outreach" \
  --http-method=POST \
  --headers="x-cron-secret=pulsesite-gcp-cron-secret-2026,Content-Type=application/json" \
  --message-body='{"trigger":"gcp_scheduler"}'

echo "=================================================="
echo "🎉 DEPLOYMENT COMPLETE!"
echo "Cloud Run App:       $SERVICE_URL"
echo "Cloud Scheduler:     Executing daily at 9:00 AM (IST)"
echo "=================================================="

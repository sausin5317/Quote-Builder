---
description: Deploy Quote Builder to Google Cloud Run
---

// turbo-all

## Prerequisites
1. Install Google Cloud CLI: https://cloud.google.com/sdk/docs/install
2. Run `gcloud init` and sign in with your Google account
3. Create or select a GCP project with billing enabled

## Step 1: Login & Set Project
```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

## Step 2: Enable Required APIs
```bash
gcloud services enable run.googleapis.com sqladmin.googleapis.com cloudbuild.googleapis.com secretmanager.googleapis.com artifactregistry.googleapis.com
```

## Step 3: Create Cloud SQL Instance
```bash
gcloud sql instances create quote-builder-db --database-version=POSTGRES_15 --tier=db-f1-micro --region=asia-south1 --root-password=YOUR_STRONG_PASSWORD
gcloud sql databases create quote_builder --instance=quote-builder-db
gcloud sql users create appuser --instance=quote-builder-db --password=YOUR_USER_PASSWORD
```

## Step 4: Store Secrets
```bash
echo -n "postgresql://appuser:YOUR_USER_PASSWORD@/quote_builder?host=/cloudsql/PROJECT_ID:asia-south1:quote-builder-db" | gcloud secrets create DATABASE_URL --data-file=-
echo -n "your-production-session-secret" | gcloud secrets create SESSION_SECRET --data-file=-
echo -n "YOUR_GOOGLE_MAPS_API_KEY" | gcloud secrets create GOOGLE_MAPS_API_KEY --data-file=-
```

## Step 5: Create Artifact Registry
```bash
gcloud artifacts repositories create quote-builder --repository-format=docker --location=asia-south1
```

## Step 6: Build & Deploy with Cloud Build (no Docker needed locally)
```bash
gcloud builds submit --tag asia-south1-docker.pkg.dev/YOUR_PROJECT_ID/quote-builder/app:latest
```

## Step 7: Deploy to Cloud Run
```bash
gcloud run deploy quote-builder --image=asia-south1-docker.pkg.dev/YOUR_PROJECT_ID/quote-builder/app:latest --region=asia-south1 --platform=managed --allow-unauthenticated --port=8080 --memory=512Mi --cpu=1 --min-instances=0 --max-instances=3 --add-cloudsql-instances=YOUR_PROJECT_ID:asia-south1:quote-builder-db --set-secrets=DATABASE_URL=DATABASE_URL:latest,SESSION_SECRET=SESSION_SECRET:latest,VITE_GOOGLE_MAPS_API_KEY=GOOGLE_MAPS_API_KEY:latest
```

## Step 8: Run DB Migrations
Install Cloud SQL Proxy, then:
```bash
cloud-sql-proxy YOUR_PROJECT_ID:asia-south1:quote-builder-db &
DATABASE_URL="postgresql://appuser:YOUR_USER_PASSWORD@127.0.0.1:5432/quote_builder" npm run db:push
```

## Get Your App URL
```bash
gcloud run services describe quote-builder --region=asia-south1 --format="value(status.url)"
```

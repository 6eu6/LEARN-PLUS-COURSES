# Database Query Optimization Plan

## Summary
This document outlines the optimizations applied to reduce database query consumption from 100k+ to 20-30k queries/month.

## Changes Made

### 1. Caching for Static Data (settings.ts)
- Added in-memory cache for `getSiteSettings()` with 5-minute TTL
- Reduces: ~5,000-10,000 queries/month

### 2. Caching for Categories and Counts (queries.ts)
- Added in-memory cache for `getAllCategories()` with 5-minute TTL
- Added in-memory cache for `countCourses()` with 2-minute TTL
- Added in-memory cache for `countCoursesBySource()` with 5-minute TTL
- Added `clearQueriesCache()` function for manual cache clearing
- Reduces: ~15,000-20,000 queries/month

### 3. API /api/courses Optimization
- Combined parallel fetching of settings, categories, and total courses
- Used Promise.all for concurrent data loading
- Reduced sequential queries from 3 to 1
- Reduces: ~10,000-15,000 queries/month

### 4. Scraper Optimization - Shared URL Cache (scraper.ts)
- Added global cache for existing course identifiers (URLs, titles, slugs)
- Load once per scrape run instead of per source
- Shared across UdemyFreebies and StudyBullet scrapers
- Reduces: ~30,000-40,000 queries/month

### 5. Bulk Insert Support (queries.ts)
- Added `createCoursesBulk()` function using `createMany`
- Falls back to individual creates if bulk fails
- Reduces: ~5,000-10,000 queries/month

### 6. Connection Pooling (db.ts)
- Configured Prisma with connection pooling
- max_connections: 10, min_connections: 2
- idle_timeout: 30s, max_lifetime: 60s
- Added graceful shutdown handlers
- Reduces: ~2,000-5,000 queries/month

### 7. Verification Sampling (scraper.ts)
- Optimized `shouldVerifyCoupon()` to skip StudyBullet verification (trusted source)
- Pages 1-3: verify all courses
- Pages 4-5: verify 75% of courses
- Pages 6+: verify only 20% of courses
- Month/year coupons: always verify
- Added verification statistics tracking
- Reduces: ~10,000-15,000 queries/month

## Expected Results

| Optimization | Queries Saved/Month | Priority |
|--------------|---------------------|----------|
| Static Data Caching | 15,000-20,000 | High |
| API Parallel Loading | 10,000-15,000 | High |
| Scraper URL Cache | 30,000-40,000 | High |
| Bulk Insert | 5,000-10,000 | High |
| Connection Pooling | 2,000-5,000 | Medium |
| Verification Sampling | 10,000-15,000 | Medium |
| **Total** | **72,000-105,000** | - |

## Implementation Status

- [ ] settings.ts - Caching
- [ ] queries.ts - Caching
- [ ] queries.ts - Bulk Insert
- [ ] db.ts - Connection Pooling
- [ ] scraper.ts - URL Cache
- [ ] scraper.ts - Verification Sampling
- [ ] API /api/courses - Parallel Loading
- [ ] Build Verification
- [ ] Push to main

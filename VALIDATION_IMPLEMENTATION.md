# Data Validation Implementation

## Overview
This document describes the implementation of data validation features to prevent duplicate plays and redemptions.

## Implementation Status: ✅ COMPLETE

All phases have been implemented:

### ✅ Phase 1: Database Schema Updates
- Added `email_normalized` and `phone_normalized` columns to `users` table
- Created `redemptions` table for tracking offer redemptions
- Created `validation_config` table for per-signage validation rules
- Added indexes for performance optimization

### ✅ Phase 2: Data Normalization Utilities
- Created `backend/utils/validation.js` with:
  - `normalizeEmail()` - Normalizes email addresses
  - `normalizePhone()` - Normalizes phone numbers (10 digits)
  - `generateRedemptionCode()` - Generates unique redemption codes

### ✅ Phase 3: Duplicate Validation Logic
- Updated `submitForm()` in `backend/routes/form.js` to:
  - Normalize email/phone before checking
  - Query validation config for signage
  - Check for existing plays
  - Apply validation rules:
    - Block if multiple plays not allowed
    - Enforce time window restrictions
    - Enforce max plays limit
    - Handle retry on negative outcomes

### ✅ Phase 4: Redemption Tracking
- Updated `backend/websocket/server.js` to:
  - Create redemption records on game completion
  - Only create records for non-negative outcomes
  - Generate unique redemption codes

### ✅ Phase 5: API Endpoints
- Added `GET /api/check-eligibility` - Check if user can play before submission
- Added `POST /api/verify-redemption` - Verify redemption codes

### ✅ Phase 6: Migration Script
- Created `backend/database/migrate-validation.js` to:
  - Normalize existing user data
  - Create redemption records for existing completed sessions
  - Create default validation configs

## Database Schema Changes

### New Tables

#### `redemptions`
```sql
CREATE TABLE redemptions (
  id UUID PRIMARY KEY,
  session_id UUID UNIQUE REFERENCES game_sessions(id),
  user_email VARCHAR(255) NOT NULL,
  user_phone VARCHAR(50) NOT NULL,
  outcome_id UUID REFERENCES game_outcomes(id),
  outcome_label VARCHAR(255),
  redeemed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  redemption_code VARCHAR(50) UNIQUE,
  is_redeemed BOOLEAN DEFAULT false,
  redeemed_by VARCHAR(255),
  notes TEXT
);
```

#### `validation_config`
```sql
CREATE TABLE validation_config (
  signage_id VARCHAR(50) PRIMARY KEY REFERENCES signage_instances(id),
  allow_multiple_plays BOOLEAN DEFAULT false,
  max_plays_per_email INTEGER DEFAULT 1,
  max_plays_per_phone INTEGER DEFAULT 1,
  time_window_hours INTEGER DEFAULT NULL,
  allow_retry_on_negative BOOLEAN DEFAULT false,
  check_across_signages BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Modified Tables

#### `users`
- Added `email_normalized VARCHAR(255)`
- Added `phone_normalized VARCHAR(50)`

## Configuration Options

Each signage instance can be configured with:

- **allow_multiple_plays**: Allow customers to play multiple times (default: false)
- **max_plays_per_email**: Maximum plays per email (default: 1)
- **max_plays_per_phone**: Maximum plays per phone (default: 1)
- **time_window_hours**: Time window between plays in hours (NULL = lifetime, 24 = daily, etc.)
- **allow_retry_on_negative**: Allow replay if last outcome was negative (default: false)
- **check_across_signages**: Check duplicates across all signage instances (default: false)

## API Endpoints

### Check Eligibility
```
GET /api/check-eligibility?email=user@example.com&phone=1234567890&signageId=DEFAULT
```

Response:
```json
{
  "eligible": true,
  "reason": null
}
```

### Verify Redemption
```
POST /api/verify-redemption
Content-Type: application/json

{
  "email": "user@example.com",
  "phone": "1234567890",
  "redemptionCode": "SPIN-XXXX-XXXX"
}
```

Response:
```json
{
  "valid": true,
  "redeemed": false,
  "outcome": "10% Discount",
  "sessionId": "...",
  "message": "Redemption code is valid and ready to use."
}
```

## Error Messages

Users will see these messages when validation fails:

- "You have already played this game. Each person can only play once."
- "You can only play once every X hours. Please try again later."
- "You have reached the maximum number of plays (X)."
- "Invalid redemption code"
- "Redemption code does not match the provided email or phone number"
- "This redemption code has already been used."

## Running the Migration

To migrate existing data:

```bash
node backend/database/migrate-validation.js
```

This will:
1. Normalize existing user email/phone data
2. Create redemption records for existing completed sessions
3. Create default validation configs for all signage instances

## Default Behavior

By default (if no validation config exists):
- ✅ Multiple plays: **DISABLED** (one play per person)
- ✅ Max plays: **1**
- ✅ Time window: **None** (lifetime restriction)
- ✅ Retry on negative: **DISABLED**
- ✅ Cross-signage check: **DISABLED**

## Next Steps (Optional)

1. **Admin Dashboard UI**: Add UI to configure validation rules per signage
2. **Redemption Management**: Add admin UI to view/manage redemptions
3. **Analytics**: Track duplicate attempt rates
4. **Email/Phone Verification**: Add optional verification step

## Testing Checklist

- [x] Same email cannot play twice (if disabled)
- [x] Same phone cannot play twice (if disabled)
- [x] Time window restrictions work
- [x] Max plays limit enforced
- [x] Negative outcomes can retry (if enabled)
- [x] Redemption codes are unique
- [x] Redemption cannot be used twice
- [x] Normalization handles email/phone variations
- [x] Cross-signage checking works (if enabled)

# Buzzer Feature Deployment Guide for AWS

This guide ensures the buzzer functionality works correctly on AWS deployment.

## Current Implementation Status

✅ **Backend**: Already implemented
- `submitForm` creates session with 'pending' status
- `startGame` endpoint exists and validates session
- Route registered: `POST /api/session/:sessionId/start`

✅ **Frontend**: Already implemented
- Buzzer screen with round button UI
- `handleBuzzerClick` function
- State management for buzzer workflow

## Pre-Deployment Checklist

### 1. Verify Code is Correct

**Backend (`backend/routes/form.js`)**:
- [ ] `submitForm` creates session with status `'pending'` (NOT `'queued'`)
- [ ] `submitForm` does NOT call `broadcastToSignage`
- [ ] `startGame` function exists and validates UUID
- [ ] `startGame` checks for `'pending'` status
- [ ] `startGame` calls `broadcastToSignage` and updates status to `'playing'`

**Backend Routes (`backend/routes/index.js`)**:
- [ ] `startGame` is imported from `./form.js`
- [ ] Route `POST /api/session/:sessionId/start` is registered

**Frontend (`mobile-form/src/App.jsx`)**:
- [ ] `showBuzzer` and `gameStarted` state variables exist
- [ ] Form submission sets `showBuzzer = true` and `loading = false`
- [ ] `handleBuzzerClick` function exists
- [ ] Buzzer screen UI is present with round button
- [ ] Polling only starts when `gameStarted === true`

### 2. Test Locally First

```bash
# Start backend
cd backend
npm start

# In another terminal, start mobile form
cd mobile-form
npm run dev

# Test flow:
# 1. Submit form → Should see buzzer screen
# 2. Click buzzer → Should see "Success! Watch the screen!"
# 3. Check backend logs for:
#    - "Session ... created - status: pending"
#    - "Buzzer clicked for session: ..."
#    - "Broadcasting game_start to signage"
```

## AWS Deployment Steps

### Step 1: Build Frontends

```bash
# On your local machine or EC2
cd mobile-form
npm run build
cd ../signage-display
npm run build
cd ../admin-dashboard
npm run build
```

### Step 2: Push to Git

```bash
git add .
git commit -m "Add buzzer functionality with round button"
git push origin main
```

### Step 3: Deploy on AWS EC2

```bash
# SSH into EC2
ssh -i your-key.pem ubuntu@YOUR_EC2_IP

# Navigate to project
cd ~/spinthewheel

# Pull latest changes
git pull origin main

# Rebuild all frontends (IMPORTANT!)
cd mobile-form && npm run build && cd ..
cd signage-display && npm run build && cd ..
cd admin-dashboard && npm run build && cd ..

# Verify backend code
grep -n "status.*pending" backend/routes/form.js
# Should show: VALUES ($1, $2, $3, 'pending')

grep -n "broadcastToSignage" backend/routes/form.js
# Should show it ONLY in startGame, NOT in submitForm

# Restart backend (CRITICAL!)
pm2 restart backend
# Or: pm2 restart spinthewheel-backend

# Check PM2 status
pm2 status
pm2 logs backend --lines 20
```

### Step 4: Verify Deployment

**Check Backend Logs**:
```bash
pm2 logs backend
```

**Expected logs on form submission**:
```
📝 Session [uuid] created for user [name] - status: pending (waiting for buzzer)
```

**Expected logs on buzzer click**:
```
🔔 Buzzer clicked for session: [uuid]
📋 Session status: pending, User: [name]
📡 Broadcasting game_start to signage: [signageId]
🎮 Session [uuid] started for user [name] - status: playing
```

**Test the Flow**:
1. Open mobile form: `http://YOUR_EC2_IP/play/?id=DEFAULT`
2. Submit form → Should see buzzer screen
3. Click buzzer → Should see "Success! Watch the screen!"
4. Check signage display → Should show wheel spinning

## Common Issues and Fixes

### Issue 1: Game starts immediately after form submission

**Symptoms**: No buzzer screen, game starts right away

**Causes**:
- Old code still running (PM2 not restarted)
- Frontend not rebuilt
- Backend still has old `submitForm` code

**Fix**:
```bash
# Verify backend code
cat backend/routes/form.js | grep -A 5 "INSERT INTO game_sessions"
# Should show: VALUES ($1, $2, $3, 'pending')

# If shows 'queued', code is wrong
# Restart PM2
pm2 restart backend

# Clear browser cache and test again
```

### Issue 2: Buzzer button not clickable

**Symptoms**: Button shows but doesn't respond to clicks

**Causes**:
- `loading` state not reset after form submission
- `sessionId` is null

**Fix**:
- Check browser console for errors
- Verify `setLoading(false)` is called after form submission
- Verify `sessionId` is set correctly

### Issue 3: Error when clicking buzzer

**Symptoms**: Error message appears when clicking buzzer

**Check**:
1. Backend logs: `pm2 logs backend`
2. Browser console: F12 → Console tab
3. Network tab: Check if request to `/api/session/[id]/start` is made

**Common errors**:
- `404 Not Found` → Route not registered, check `backend/routes/index.js`
- `400 Invalid session ID format` → UUID validation issue
- `400 Game cannot be started. Current status: [status]` → Session not in 'pending' state

**Fix**:
```bash
# Check route registration
grep "startGame" backend/routes/index.js

# Check session status in database
psql -h YOUR_RDS_ENDPOINT -U postgres -d spinthewheel
SELECT id, status FROM game_sessions ORDER BY timestamp DESC LIMIT 5;
```

### Issue 4: Frontend shows old version

**Symptoms**: Changes not visible, old UI still showing

**Causes**:
- Frontend not rebuilt
- Browser cache
- Nginx serving old files

**Fix**:
```bash
# Rebuild frontend
cd mobile-form
npm run build

# Clear Nginx cache (if using)
sudo systemctl reload nginx

# Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)
```

## Verification Commands

### Check Backend Code
```bash
# Verify submitForm doesn't broadcast
grep -A 10 "submitForm" backend/routes/form.js | grep -v "broadcastToSignage" | grep "broadcastToSignage"
# Should return nothing (no matches)

# Verify startGame exists
grep -n "export async function startGame" backend/routes/form.js
# Should show line number

# Verify route registration
grep -n "startGame" backend/routes/index.js
# Should show import and route registration
```

### Check Frontend Code
```bash
# Verify buzzer state exists
grep -n "showBuzzer" mobile-form/src/App.jsx
# Should show multiple lines

# Verify buzzer click handler
grep -n "handleBuzzerClick" mobile-form/src/App.jsx
# Should show function definition
```

### Test API Endpoints
```bash
# Test form submission (should return sessionId, NOT start game)
curl -X POST http://localhost:3001/api/submit \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","phone":"1234567890","signageId":"DEFAULT"}'

# Test buzzer endpoint (should start game)
curl -X POST http://localhost:3001/api/session/[SESSION_ID]/start
```

## Success Criteria

✅ Form submission shows buzzer screen (not "Success! Watch the screen!")  
✅ Buzzer button is clickable and shows round red button  
✅ Clicking buzzer shows "Success! Watch the screen!"  
✅ Signage display shows wheel spinning after buzzer click  
✅ Mobile form shows result after game completes  
✅ Backend logs show correct flow: pending → playing → completed  

## Rollback Plan

If buzzer doesn't work on AWS:

```bash
# Revert to commit before buzzer
git log --oneline | grep -i buzzer
git revert [commit-hash]

# Or restore from backup commit
git checkout b71e076d0af53e728fea72ef060b6c2e21eb26fa -- backend/routes/form.js mobile-form/src/App.jsx

# Rebuild and restart
cd mobile-form && npm run build && cd ..
pm2 restart backend
```

## Notes

- Always test locally before deploying to AWS
- Always rebuild frontends after code changes
- Always restart PM2 after backend changes
- Check logs immediately after deployment
- Clear browser cache when testing

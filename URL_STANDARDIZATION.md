# URL Parameter Standardization

## Summary

All URLs in the Spin the Wheel application now use the **`?id=`** parameter for consistency.

## What Changed

### Before (Inconsistent)
- Mobile form used: `?signage=INSTANCE_ID`
- Signage display used: `?id=INSTANCE_ID`
- Admin dashboard used: `?id=INSTANCE_ID`
- QR code generated: `?id=INSTANCE_ID`

**Problem:** QR code generated `?id=` but mobile form expected `?signage=` ❌

### After (Consistent)
All components now use: **`?id=INSTANCE_ID`** ✅

## URL Reference

| Component | URL Format | Example |
|-----------|------------|---------|
| **Superadmin** | `/superadmin` | `http://yourserver.com/superadmin` |
| **Instance Admin** | `/admin?id=INSTANCE_ID` | `http://yourserver.com/admin?id=store_1` |
| **Signage Display** | `/signage?id=INSTANCE_ID` | `http://yourserver.com/signage?id=store_1` |
| **Mobile Form** | `/play?id=INSTANCE_ID` | `http://yourserver.com/play?id=store_1` |

## Files Modified

### Code Changes
1. **`mobile-form/src/App.jsx`** (Line 17)
   - Changed from: `params.get('signage')`
   - Changed to: `params.get('id')`

### Documentation Updates
2. **`AWS_DEPLOYMENT.md`** - Updated all mobile form URLs
3. **`QUICK_DEPLOY.md`** - Updated all mobile form URLs
4. **`QUICKSTART.md`** - Updated all mobile form URLs
5. **`INSTANCE_SETUP.md`** - Updated all mobile form URLs
6. **`ACCESS_URLS.md`** - Updated all mobile form URLs and parameter references
7. **`README.md`** - Added URL Structure section with standardization note

## Benefits

1. **Consistency** - All components use the same parameter name
2. **Simplicity** - One rule: always use `?id=`
3. **No Confusion** - QR codes work correctly with mobile form
4. **Easy to Remember** - Developers only need to remember one parameter

## Migration Guide

If you have existing bookmarks or links using `?signage=`, simply replace them with `?id=`:

```
OLD: http://yourserver.com/play/?signage=store_1
NEW: http://yourserver.com/play/?id=store_1
```

## Testing

After deployment, verify:

1. ✅ Open signage display: `http://yourserver.com/signage?id=DEFAULT`
2. ✅ Scan the QR code
3. ✅ Mobile form should open with: `http://yourserver.com/play?id=DEFAULT`
4. ✅ Submit the form and watch the wheel spin

All URLs should now work consistently across the entire application.

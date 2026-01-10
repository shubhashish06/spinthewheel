# Access URLs - Complete Guide

Complete reference for accessing all components of the Spin the Wheel application.

## Production URLs (After Deployment)

### Superadmin Dashboard
**Central dashboard for managing all instances**

```
https://yourdomain.com/superadmin
```
or
```
https://yourdomain.com/admin/super
```

**Purpose:**
- Create new signage instances
- List all instances
- Edit instance details (location name, active status)
- Activate/deactivate instances
- Delete instances
- Direct links to manage each instance

---

### Instance Admin Dashboard
**Instance-specific dashboard for managing individual signage**

```
https://yourdomain.com/admin?id=INSTANCE_ID
```

**Examples:**
```
https://yourdomain.com/admin?id=DEFAULT
https://yourdomain.com/admin?id=store_1
https://yourdomain.com/admin?id=store_2
https://yourdomain.com/admin?id=mall_kiosk
```

**Purpose:**
- View instance statistics
- Manage outcomes/prizes for this instance
- View users and sessions for this instance
- Customize background for this instance
- Instance-specific settings

**Features:**
- Overview tab: Statistics dashboard
- Users tab: List of users who played
- Sessions tab: Game session history
- Outcomes tab: Manage prizes and weights
- Background tab: Customize visual appearance

---

### Mobile Form (User Entry)
**Form where users enter their information**

```
https://yourdomain.com/play/?id=INSTANCE_ID
```

**Examples:**
```
https://yourdomain.com/play/?id=DEFAULT
https://yourdomain.com/play/?id=store_1
https://yourdomain.com/play/?id=store_2
```

**Purpose:**
- Users enter name, email (optional), phone (optional)
- Submit to start the game
- Mobile-optimized interface
- Automatically linked to correct signage instance

**Note:** The `id` parameter must match an existing instance ID (created in superadmin)

---

### Signage Display (Game Screen)
**Fullscreen display showing QR code, wheel, and results**

```
https://yourdomain.com/signage?id=INSTANCE_ID
```

**Examples:**
```
https://yourdomain.com/signage?id=DEFAULT
https://yourdomain.com/signage?id=store_1
https://yourdomain.com/signage?id=store_2
```

**Purpose:**
- Display QR code for users to scan
- Show spinning wheel animation
- Display game results
- Fullscreen display interface

**States:**
1. **Idle**: Shows QR code and "Scan to Play" message
2. **Playing**: Wheel spins for 10 seconds
3. **Result**: Shows winner and prize for 5 seconds

**Note:** The `id` parameter must match an existing instance ID (created in superadmin)

---

## Development URLs (Local)

When running `npm run dev`, access at:

- **Backend API**: `http://localhost:3001`
- **Mobile Form**: `http://localhost:3002?id=DEFAULT`
- **Signage Display**: `http://localhost:3003?id=DEFAULT`
- **Admin Dashboard**: `http://localhost:3004`
- **Superadmin**: `http://localhost:3004/superadmin` (after build)

When running production build locally:

- **Superadmin**: `http://localhost:3001/superadmin`
- **Instance Admin**: `http://localhost:3001/admin?id=DEFAULT`
- **Mobile Form**: `http://localhost:3001/play/?id=DEFAULT`
- **Signage Display**: `http://localhost:3001/signage?id=DEFAULT`

---

## URL Parameter Reference

| Component | Parameter | Example | Required |
|-----------|----------|---------|----------|
| **Superadmin** | None | `/superadmin` | No |
| **Instance Admin** | `?id=INSTANCE_ID` | `/admin?id=store_1` | Yes |
| **Mobile Form** | `?id=INSTANCE_ID` | `/play/?id=store_1` | Yes |
| **Signage Display** | `?id=INSTANCE_ID` | `/signage?id=store_1` | Yes |

---

## Complete Workflow Example

### For Store 1 (`store_1`):

1. **Create Instance** (Superadmin):
   ```
   https://yourdomain.com/superadmin
   → Create instance: ID=store_1, Name="Store 1"
   ```

2. **Manage Instance** (Instance Admin):
   ```
   https://yourdomain.com/admin?id=store_1
   → Configure outcomes, background, view stats
   ```

3. **Display on Screen** (Signage):
   ```
   https://yourdomain.com/signage?id=store_1
   → Shows QR code, wheel, results
   ```

4. **User Plays** (Mobile Form):
   ```
   https://yourdomain.com/play/?id=store_1
   → User scans QR code, enters info, submits
   ```

---

## Important Notes

1. **Instance IDs must exist**: Create instances in superadmin before using them
2. **URL parameters are case-sensitive**: `store_1` ≠ `Store_1`
3. **No auto-creation**: Instances must be created manually via superadmin
4. **Separate dashboards**: Each instance has its own dedicated admin dashboard
5. **Superadmin is central**: All instance management happens in superadmin

---

## Quick Reference Table

| Component | Production URL | Purpose |
|-----------|---------------|---------|
| **Superadmin** | `https://yourdomain.com/superadmin` | Manage all instances |
| **Instance Admin** | `https://yourdomain.com/admin?id=INSTANCE_ID` | Manage specific instance |
| **Mobile Form** | `https://yourdomain.com/play/?id=INSTANCE_ID` | User entry form |
| **Signage Display** | `https://yourdomain.com/signage?id=INSTANCE_ID` | Game display screen |

---

## Troubleshooting

### Instance not found errors
- Ensure instance exists: Check superadmin dashboard
- Verify instance ID spelling (case-sensitive)
- Check instance is active in superadmin

### Dashboard not loading
- Ensure backend server is running
- Check that admin dashboard is built: `cd admin-dashboard && npm run build`
- Verify `/admin` and `/superadmin` routes are configured

### Form submission fails
- Verify instance ID exists in superadmin
- Check instance is active (not deactivated)
- Ensure database connection is working

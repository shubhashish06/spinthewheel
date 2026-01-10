# Admin Dashboard Documentation

Complete guide to the admin dashboard system for Spin the Wheel.

## Dashboard Types

The system has two types of admin dashboards:

1. **Superadmin Dashboard** - Central management for all instances
2. **Instance Admin Dashboard** - Instance-specific management

---

## Superadmin Dashboard

### Access

```
http://localhost:3001/superadmin
```
or
```
http://localhost:3001/admin/super
```

### Features

#### Instance Management
- **Create Instances**: Add new signage instances with ID and location name
- **List All Instances**: View all instances in a table
- **Edit Instances**: Modify location name and active status
- **Activate/Deactivate**: Toggle instance status
- **Delete Instances**: Remove instances (with cascade delete of all data)
- **Direct Links**: Quick access to manage each instance

#### Instance Table
- Instance ID
- Location Name
- Active/Inactive Status
- Creation Date
- Action buttons (Manage, Edit, Activate/Deactivate, Delete)

### Usage

1. **Create New Instance**:
   - Click "+ Create New Instance"
   - Enter Instance ID (lowercase, underscores allowed, e.g., `store_1`)
   - Enter Location Name (e.g., "Downtown Store")
   - Click "Create Instance"
   - Instance is created with default outcomes and background

2. **Edit Instance**:
   - Click "Edit" button
   - Modify location name or active status
   - Press Enter or click "Save"

3. **Manage Instance**:
   - Click "Manage" button
   - Opens instance-specific admin dashboard

4. **Delete Instance**:
   - Click "Delete" button
   - Confirm deletion
   - All associated data (users, sessions, outcomes) is deleted

---

## Instance Admin Dashboard

### Access

```
http://localhost:3001/admin?id=INSTANCE_ID
```

**Examples:**
```
http://localhost:3001/admin?id=DEFAULT
http://localhost:3001/admin?id=store_1
http://localhost:3001/admin?id=store_2
```

### Features

#### Overview Tab (📊)
- Total users count for this instance
- Total game sessions
- Completed sessions
- Real-time statistics
- Refreshable data

#### Users Tab (👥)
- View all users who submitted forms for this instance
- User details: name, email, phone
- Submission timestamps
- Filterable and sortable

#### Sessions Tab (🎮)
- Complete game session history for this instance
- Status tracking: queued → playing → completed
- Outcome tracking per session
- User-session linking
- Filter by status

#### Outcomes Tab (🎯)
- Manage game outcomes/prizes for this instance
- **Inline Weight Editing**: Click any weight to edit
- **Bulk Edit Mode**: Update multiple weights at once
- **Real-time Percentages**: See probability percentages as you edit
- **Create Outcomes**: Add new prizes
- **Delete Outcomes**: Remove unwanted prizes
- **Weight Statistics**: View total weight and individual percentages

#### Background Tab (🎨)
- Customize wheel game background for this instance
- **Gradient Backgrounds**: Multiple colors with smooth transitions
- **Solid Color**: Single color background
- **Image Background**: Custom image from URL
- **Live Preview**: See changes before saving
- **Presets**: Quick-select preset backgrounds
- **Real-time Updates**: Changes broadcast to signage displays immediately

---

## API Endpoints Used

### Superadmin Endpoints

```
GET  /api/signage              # List all instances
POST /api/signage              # Create new instance
PATCH /api/signage/:id         # Update instance
DELETE /api/signage/:id        # Delete instance
```

### Instance Admin Endpoints

```
GET  /api/signage/:id          # Get instance config
GET  /api/signage/:id/stats    # Get statistics
GET  /api/signage/:id/background  # Get background config
PUT  /api/signage/:id/background  # Update background
GET  /api/admin/users          # Get users (filtered by instance)
GET  /api/admin/sessions       # Get sessions (filtered by instance)
GET  /api/outcomes/:signageId  # Get outcomes
POST /api/outcomes             # Create outcome
PATCH /api/outcomes/:id/weight # Update outcome weight
PUT  /api/outcomes/weights/bulk # Bulk update weights
DELETE /api/outcomes/:id       # Delete outcome
```

---

## Usage Tips

### Probability Weights

- Probability = `(outcome_weight / total_weight) × 100`
- Example: If total weight is 100 and an outcome has weight 30, it has a 30% chance
- Higher weights = more frequent outcomes
- Weights are relative, not absolute percentages

### Instance Management

1. **Always create instances in superadmin first**
2. **Use consistent naming**: lowercase with underscores (e.g., `store_1`, `mall_kiosk`)
3. **Test each instance** before going live
4. **Monitor active status**: Deactivate instances that are not in use

### Background Customization

1. **Gradient**: Add multiple colors for smooth transitions
2. **Solid**: Use for simple, clean backgrounds
3. **Image**: Ensure image URL is publicly accessible
4. **Preview**: Always preview before saving
5. **Real-time**: Changes apply immediately to connected displays

### Outcome Management

1. **Start with defaults**: New instances get 5 default outcomes
2. **Adjust weights**: Use inline editing or bulk mode
3. **Monitor percentages**: Keep total weight reasonable (100-1000)
4. **Test probabilities**: Verify outcomes match expectations
5. **Delete carefully**: Removing outcomes affects probability distribution

---

## Workflow Examples

### Setting Up a New Store

1. **Create Instance** (Superadmin):
   ```
   Go to: http://localhost:3001/superadmin
   → Create: ID=store_1, Name="Store 1"
   ```

2. **Configure Outcomes** (Instance Admin):
   ```
   Go to: http://localhost:3001/admin?id=store_1
   → Outcomes tab
   → Edit weights or add new outcomes
   ```

3. **Customize Background** (Instance Admin):
   ```
   → Background tab
   → Select type and configure
   → Save
   ```

4. **Set Up Signage Display**:
   ```
   Open: http://localhost:3001/signage?id=store_1
   → Fullscreen on display device
   ```

### Managing Multiple Locations

1. **Create all instances** in superadmin
2. **Access each instance dashboard** separately
3. **Customize per location** (outcomes, background)
4. **Monitor statistics** per instance
5. **Manage centrally** from superadmin

---

## Troubleshooting

### Dashboard not loading
- Ensure backend server is running on port 3001
- Check that dashboard is built: `cd admin-dashboard && npm run build`
- Verify routes are configured in backend server
- Check browser console for errors

### Instance not found
- Verify instance exists in superadmin
- Check instance ID spelling (case-sensitive)
- Ensure instance is active (not deactivated)

### API errors
- Check backend server logs
- Verify database connection
- Ensure API endpoints are accessible
- Check CORS configuration

### No data showing
- Verify database has data
- Check signage ID is correct
- Ensure instance is active
- Check browser console for errors

### Background not updating
- Verify background config is saved
- Check WebSocket connection on signage display
- Ensure signage display is connected
- Refresh signage display page

---

## Security Considerations

1. **Access Control**: Consider adding authentication for production
2. **Instance Isolation**: Each instance dashboard only shows its own data
3. **Superadmin Access**: Restrict superadmin access in production
4. **API Security**: Use HTTPS in production
5. **Database Security**: Use strong passwords and restrict access

---

## Best Practices

1. **Naming Convention**: Use lowercase with underscores for instance IDs
2. **Regular Backups**: Backup database regularly
3. **Monitor Usage**: Track instance activity in superadmin
4. **Test Changes**: Test outcome and background changes before production
5. **Documentation**: Keep track of instance configurations

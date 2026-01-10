# Weight Management API Documentation

This document describes the API endpoints for managing probability weights of game outcomes.

## Endpoints

### 1. Update Single Outcome Weight

**PATCH** `/api/outcomes/:id/weight`

Update the probability weight of a specific outcome.

**Parameters:**
- `id` (URL parameter): UUID of the outcome

**Request Body:**
```json
{
  "probability_weight": 25
}
```

**Response:**
```json
{
  "id": "uuid",
  "label": "10% Discount",
  "probability_weight": 25,
  "is_active": true,
  "signage_id": "DEFAULT",
  "created_at": "2024-01-01T00:00:00.000Z"
}
```

**Example:**
```bash
curl -X PATCH http://localhost:3001/api/outcomes/123e4567-e89b-12d3-a456-426614174000/weight \
  -H "Content-Type: application/json" \
  -d '{"probability_weight": 30}'
```

---

### 2. Bulk Update Weights

**PUT** `/api/outcomes/weights/bulk`

Update weights for multiple outcomes at once. All updates are performed in a transaction.

**Request Body:**
```json
{
  "outcomes": [
    {
      "id": "uuid-1",
      "probability_weight": 30
    },
    {
      "id": "uuid-2",
      "probability_weight": 20
    },
    {
      "id": "uuid-3",
      "probability_weight": 50
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Updated 3 outcome(s)",
  "outcomes": [
    {
      "id": "uuid-1",
      "label": "10% Discount",
      "probability_weight": 30,
      "is_active": true,
      "signage_id": "DEFAULT",
      "created_at": "2024-01-01T00:00:00.000Z"
    },
    ...
  ]
}
```

**Example:**
```bash
curl -X PUT http://localhost:3001/api/outcomes/weights/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "outcomes": [
      {"id": "uuid-1", "probability_weight": 30},
      {"id": "uuid-2", "probability_weight": 20}
    ]
  }'
```

---

### 3. Get Weight Statistics

**GET** `/api/outcomes/:signageId?/weights/stats`

Get all outcomes with their weights and calculated percentages for a specific signage (or global if no signageId).

**Parameters:**
- `signageId` (optional): Signage ID to filter outcomes. If omitted, returns global outcomes.

**Response:**
```json
{
  "outcomes": [
    {
      "id": "uuid-1",
      "label": "10% Discount",
      "probability_weight": 30,
      "percentage": 30.00
    },
    {
      "id": "uuid-2",
      "label": "Free Item",
      "probability_weight": 20,
      "percentage": 20.00
    },
    {
      "id": "uuid-3",
      "label": "Try Again",
      "probability_weight": 50,
      "percentage": 50.00
    }
  ],
  "totalWeight": 100,
  "signageId": "DEFAULT"
}
```

**Example:**
```bash
# Get stats for specific signage
curl http://localhost:3001/api/outcomes/DEFAULT/weights/stats

# Get global stats
curl http://localhost:3001/api/outcomes/weights/stats
```

---

### 4. Update Outcome (General)

**PUT** `/api/outcomes/:id`

Update any field of an outcome, including weight. This is the general update endpoint.

**Parameters:**
- `id` (URL parameter): UUID of the outcome

**Request Body:**
```json
{
  "label": "Updated Label",
  "probability_weight": 25,
  "is_active": true
}
```

All fields are optional. Only provided fields will be updated.

**Response:**
```json
{
  "id": "uuid",
  "label": "Updated Label",
  "probability_weight": 25,
  "is_active": true,
  "signage_id": "DEFAULT",
  "created_at": "2024-01-01T00:00:00.000Z"
}
```

**Example:**
```bash
curl -X PUT http://localhost:3001/api/outcomes/123e4567-e89b-12d3-a456-426614174000 \
  -H "Content-Type: application/json" \
  -d '{"probability_weight": 35, "label": "New Label"}'
```

---

## Validation Rules

1. **probability_weight** must be:
   - A positive integer
   - Minimum value: 1
   - Cannot be null or undefined

2. **label** must be:
   - A non-empty string
   - Will be trimmed of whitespace

3. **is_active** must be:
   - A boolean value

## Error Responses

### 400 Bad Request
```json
{
  "error": "probability_weight must be a positive integer (minimum 1)"
}
```

### 404 Not Found
```json
{
  "error": "Outcome not found"
}
```

### 503 Service Unavailable
```json
{
  "error": "Database connection unavailable. Please ensure PostgreSQL is running."
}
```

## How Weights Work

Probability weights determine the likelihood of each outcome being selected:

- **Higher weight = Higher probability**
- Weights are relative (not percentages)
- Total weight is the sum of all active outcomes
- Percentage = (outcome_weight / total_weight) × 100

**Example:**
- Outcome A: weight 30 → 30% chance
- Outcome B: weight 20 → 20% chance
- Outcome C: weight 50 → 50% chance
- Total: 100

## Best Practices

1. **Use bulk update** when changing multiple weights to ensure consistency
2. **Check weight stats** before making changes to see current distribution
3. **Keep weights reasonable** - very large weights don't improve precision
4. **Test changes** with the weight stats endpoint to verify percentages

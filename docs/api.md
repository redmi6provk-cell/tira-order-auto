# API Reference

Complete API documentation for the Tira Order Automation System.

**Base URL:** `http://localhost:8000/api`

**Interactive Documentation:** `http://localhost:8000/docs` (Swagger UI)

---

## Authentication

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

### POST /api/auth/login

Authenticate admin user and receive JWT token.

**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "your_password"
}
```

**Response:** `200 OK`
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

**Errors:**
- `401 Unauthorized` - Invalid credentials

---

### GET /api/auth/me

Get current authenticated user information.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "id": 1,
  "email": "admin@example.com",
  "name": "Admin User",
  "created_at": "2026-01-01T00:00:00"
}
```

---

## Orders

### POST /api/orders/execute

Execute automated order placement for a range of users.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "user_range_start": 1,
  "user_range_end": 5,
  "product_ids": [101, 102],
  "address_id": 1,
  "concurrent_browsers": 3,
  "headless": true
}
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `user_range_start` | integer | Yes | Starting user ID |
| `user_range_end` | integer | Yes | Ending user ID (inclusive) |
| `product_ids` | array[integer] | Yes | List of product IDs to order |
| `address_id` | integer | Yes | Address ID for delivery |
| `concurrent_browsers` | integer | No | Max concurrent sessions (default: 3) |
| `headless` | boolean | No | Run browsers in headless mode (default: true) |

**Response:** `200 OK`
```json
{
  "message": "Order automation started",
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_count": 5
}
```

---

### GET /api/orders

Get order history with optional filtering.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `user_id` | integer | Filter by user ID |
| `status` | string | Filter by status (success/failed) |
| `limit` | integer | Max results (default: 100) |

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "user_id": 1,
    "user_name": "User 1",
    "user_email": "user1@example.com",
    "order_id": "TIRA123456",
    "products": [
      {
        "id": 101,
        "name": "Product A",
        "price": 999.00,
        "quantity": 1
      }
    ],
    "address": {
      "id": 1,
      "name": "Home",
      "street": "123 Main St"
    },
    "total_amount": 999.00,
    "status": "success",
    "created_at": "2026-02-02T10:00:00",
    "completed_at": "2026-02-02T10:05:00"
  }
]
```

---

### DELETE /api/orders/clear

Clear all order history.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "message": "Order history cleared successfully",
  "deleted_count": 42
}
```

---

## Checkpoints (Loyalty Points)

### POST /api/checkpoints/execute

Execute automated points checking for a range of users.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "user_range_start": 1,
  "user_range_end": 10,
  "concurrent_browsers": 5,
  "headless": true
}
```

**Response:** `200 OK`
```json
{
  "task_id": "a47a39c2-9103-4caa-a477-4bf0171a3208",
  "message": "Checkpoint automation started"
}
```

---

### GET /api/checkpoints/status/{task_id}

Get status of a checkpoint task.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "status": "processing",
  "progress": 7,
  "total": 10,
  "started_at": "2026-02-02T10:00:00",
  "completed_at": null,
  "error": null
}
```

**Status Values:**
- `processing` - Task is running
- `completed` - Task finished successfully
- `failed` - Task encountered an error

---

### GET /api/checkpoints/results/{task_id}

Get results of a checkpoint task.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
[
  {
    "user_id": 1,
    "username": "User 1",
    "email": "user1@example.com",
    "points": "2215",
    "account_name": "All Star",
    "status": "success",
    "error": null,
    "checked_at": "2026-02-02T10:05:00"
  },
  {
    "user_id": 2,
    "username": "User 2",
    "email": "user2@example.com",
    "points": "N/A",
    "account_name": "N/A",
    "status": "logged_out",
    "error": "Auth failed (403)",
    "checked_at": "2026-02-02T10:05:05"
  }
]
```

**Result Status Values:**
- `success` - Points retrieved successfully
- `logged_out` - User session expired (401/403)
- `failed` - Request failed

---

## Products

### GET /api/products

Get all products.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
[
  {
    "id": 101,
    "name": "Lipstick - Red",
    "price": 999.00,
    "url": "https://www.tirabeauty.com/product/lipstick-red",
    "image": "https://cdn.tirabeauty.com/lipstick.jpg",
    "in_stock": true
  }
]
```

---

### POST /api/products

Add a new product.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "Lipstick - Red",
  "price": 999.00,
  "url": "https://www.tirabeauty.com/product/lipstick-red",
  "image": "https://cdn.tirabeauty.com/lipstick.jpg"
}
```

**Response:** `201 Created`
```json
{
  "id": 101,
  "name": "Lipstick - Red",
  "price": 999.00,
  "url": "https://www.tirabeauty.com/product/lipstick-red",
  "image": "https://cdn.tirabeauty.com/lipstick.jpg",
  "in_stock": true,
  "created_at": "2026-02-02T10:00:00"
}
```

---

### DELETE /api/products/{product_id}

Delete a product.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "message": "Product deleted successfully"
}
```

---

## Addresses

### GET /api/addresses

Get all addresses.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "name": "Home",
    "street": "123 Main Street",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "phone": "+91 9876543210",
    "is_default": true
  }
]
```

---

### POST /api/addresses

Add a new address.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "Office",
  "street": "456 Business Park",
  "city": "Mumbai",
  "state": "Maharashtra",
  "pincode": "400002",
  "phone": "+91 9876543211"
}
```

**Response:** `201 Created`
```json
{
  "id": 2,
  "name": "Office",
  "street": "456 Business Park",
  "city": "Mumbai",
  "state": "Maharashtra",
  "pincode": "400002",
  "phone": "+91 9876543211",
  "is_default": false,
  "created_at": "2026-02-02T10:00:00"
}
```

---

### PUT /api/addresses/{address_id}

Update an existing address.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "Office (Updated)",
  "street": "456 Business Park, Floor 3",
  "city": "Mumbai",
  "state": "Maharashtra",
  "pincode": "400002",
  "phone": "+91 9876543211"
}
```

**Response:** `200 OK`
```json
{
  "id": 2,
  "name": "Office (Updated)",
  "street": "456 Business Park, Floor 3",
  "city": "Mumbai",
  "state": "Maharashtra",
  "pincode": "400002",
  "phone": "+91 9876543211",
  "is_default": false,
  "updated_at": "2026-02-02T11:00:00"
}
```

---

### DELETE /api/addresses/{address_id}

Delete an address.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "message": "Address deleted successfully"
}
```

---

## WebSocket

### WS /ws/logs

Real-time log streaming for automation tasks.

**Connection:**
```javascript
const ws = new WebSocket('ws://localhost:8000/ws/logs');

ws.onmessage = (event) => {
  const log = JSON.parse(event.data);
  console.log(log);
};
```

**Message Format:**
```json
{
  "timestamp": "2026-02-02T10:00:00",
  "level": "INFO",
  "message": "Starting order automation for user 1",
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": 1
}
```

**Log Levels:**
- `DEBUG` - Detailed debugging information
- `INFO` - General informational messages
- `WARNING` - Warning messages
- `ERROR` - Error messages
- `CRITICAL` - Critical errors

---

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "detail": "Invalid request parameters"
}
```

### 401 Unauthorized
```json
{
  "detail": "Not authenticated"
}
```

### 403 Forbidden
```json
{
  "detail": "Not enough permissions"
}
```

### 404 Not Found
```json
{
  "detail": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "detail": "Internal server error"
}
```

---

## Rate Limiting

**Current Implementation:** No rate limiting

**Recommended for Production:**
- 100 requests per minute per IP
- 1000 requests per hour per user
- Implement using middleware (e.g., slowapi)

---

## Pagination

**Current Implementation:** Limited by `limit` query parameter

**Future Enhancement:**
```
GET /api/orders?page=2&per_page=20
```

Response with pagination metadata:
```json
{
  "data": [...],
  "pagination": {
    "page": 2,
    "per_page": 20,
    "total": 100,
    "pages": 5
  }
}
```

---

## API Versioning

**Current:** No versioning (v1 implicit)

**Future:**
- URL-based: `/api/v2/orders`
- Header-based: `Accept: application/vnd.tira.v2+json`

---

**Last Updated:** February 2026

# Database Schema

PostgreSQL database schema for the Tira Order Automation System.

**Database Name:** `tira_automation`  
**User:** `tira_admin`  
**Port:** `5432`

---

## Entity Relationship Diagram

```
┌─────────────────┐
│  admin_users    │
├─────────────────┤
│ id (PK)         │
│ email           │
│ password_hash   │
│ name            │
│ created_at      │
└─────────────────┘

┌─────────────────────┐
│    tira_users       │
├─────────────────────┤
│ id (PK)             │
│ name                │
│ email               │
│ phone               │
│ cookies (JSONB)     │◄──┐
│ points              │   │
│ created_at          │   │
│ updated_at          │   │
└─────────────────────┘   │
         │                │
         │ 1:N            │
         ▼                │
┌─────────────────────┐   │
│      orders         │   │
├─────────────────────┤   │
│ id (PK)             │   │
│ user_id (FK)        │───┘
│ order_id            │
│ products (JSONB)    │
│ address (JSONB)     │
│ total_amount        │
│ status              │
│ session_id          │
│ created_at          │
│ completed_at        │
└─────────────────────┘
         │
         │ 1:N
         ▼
┌─────────────────────┐
│    order_logs       │
├─────────────────────┤
│ id (PK)             │
│ order_id (FK)       │
│ user_id             │
│ level               │
│ message             │
│ timestamp           │
└─────────────────────┘

┌─────────────────┐
│    products     │
├─────────────────┤
│ id (PK)         │
│ name            │
│ price           │
│ url             │
│ image           │
│ in_stock        │
│ created_at      │
└─────────────────┘

┌─────────────────┐
│   addresses     │
├─────────────────┤
│ id (PK)         │
│ name            │
│ street          │
│ city            │
│ state           │
│ pincode         │
│ phone           │
│ is_default      │
│ created_at      │
└─────────────────┘
```

---

## Tables

### admin_users

Admin authentication table.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | SERIAL | PRIMARY KEY | Auto-incrementing ID |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | Admin email (login) |
| `password_hash` | VARCHAR(255) | NOT NULL | Bcrypt hashed password |
| `name` | VARCHAR(255) | NOT NULL | Admin display name |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Account creation time |

**Indexes:**
- PRIMARY KEY on `id`
- UNIQUE INDEX on `email`

**Sample Data:**
```sql
INSERT INTO admin_users (email, password_hash, name) VALUES
('admin@tira.com', '$2b$12$...', 'Admin User');
```

---

### tira_users

Tira platform user accounts with cookies and points.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | SERIAL | PRIMARY KEY | Auto-incrementing ID |
| `name` | VARCHAR(255) | NOT NULL | User display name |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | User email |
| `phone` | VARCHAR(20) | | Phone number |
| `cookies` | JSONB | | Playwright cookies (array) |
| `points` | VARCHAR(50) | | Earned loyalty points |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Account creation time |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Last update time |

**Indexes:**
- PRIMARY KEY on `id`
- UNIQUE INDEX on `email`
- INDEX on `points` for sorting

**Sample Data:**
```sql
INSERT INTO tira_users (name, email, phone, cookies, points) VALUES
('User 1', 'user1@example.com', '+91 9876543210', 
 '[{"name": "f.session", "value": "s%3A...", "domain": ".tirabeauty.com"}]',
 '2215');
```

**Cookies JSONB Structure:**
```json
[
  {
    "name": "f.session",
    "value": "s%3AbK_88JTBaOkxr4ffBru3WDnXOQnXp_Mf...",
    "domain": ".tirabeauty.com",
    "path": "/",
    "expires": 1738425600,
    "httpOnly": true,
    "secure": true,
    "sameSite": "Lax"
  }
]
```

---

### products

Product catalog for order automation.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | SERIAL | PRIMARY KEY | Auto-incrementing ID |
| `name` | VARCHAR(255) | NOT NULL | Product name |
| `price` | DECIMAL(10,2) | NOT NULL | Product price (₹) |
| `url` | TEXT | NOT NULL | Product page URL |
| `image` | TEXT | | Product image URL |
| `in_stock` | BOOLEAN | DEFAULT TRUE | Stock status |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Added to catalog |

**Indexes:**
- PRIMARY KEY on `id`
- INDEX on `in_stock` for filtering

**Sample Data:**
```sql
INSERT INTO products (name, price, url, image) VALUES
('Lipstick - Red', 999.00, 
 'https://www.tirabeauty.com/product/lipstick-red',
 'https://cdn.tirabeauty.com/lipstick.jpg');
```

---

### addresses

Delivery addresses for order automation.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | SERIAL | PRIMARY KEY | Auto-incrementing ID |
| `name` | VARCHAR(255) | NOT NULL | Address label (e.g., "Home") |
| `street` | TEXT | NOT NULL | Street address |
| `city` | VARCHAR(100) | NOT NULL | City name |
| `state` | VARCHAR(100) | NOT NULL | State name |
| `pincode` | VARCHAR(10) | NOT NULL | Postal code |
| `phone` | VARCHAR(20) | NOT NULL | Contact phone |
| `is_default` | BOOLEAN | DEFAULT FALSE | Default address flag |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Address creation time |

**Indexes:**
- PRIMARY KEY on `id`
- INDEX on `is_default`

**Sample Data:**
```sql
INSERT INTO addresses (name, street, city, state, pincode, phone, is_default) VALUES
('Home', '123 Main Street', 'Mumbai', 'Maharashtra', '400001', '+91 9876543210', TRUE);
```

---

### orders

Order execution history.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | SERIAL | PRIMARY KEY | Auto-incrementing ID |
| `user_id` | INTEGER | FOREIGN KEY → tira_users(id) | User who placed order |
| `order_id` | VARCHAR(100) | | Tira order ID (if successful) |
| `products` | JSONB | NOT NULL | Ordered products (array) |
| `address` | JSONB | NOT NULL | Delivery address (object) |
| `total_amount` | DECIMAL(10,2) | | Total order amount |
| `status` | VARCHAR(50) | NOT NULL | Order status |
| `session_id` | VARCHAR(100) | | Automation session ID |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Order start time |
| `completed_at` | TIMESTAMP | | Order completion time |

**Indexes:**
- PRIMARY KEY on `id`
- FOREIGN KEY on `user_id` REFERENCES `tira_users(id)`
- INDEX on `status`
- INDEX on `session_id`
- INDEX on `created_at` DESC

**Status Values:**
- `success` - Order placed successfully
- `failed` - Order failed
- `processing` - Order in progress

**Products JSONB Structure:**
```json
[
  {
    "id": 101,
    "name": "Lipstick - Red",
    "price": 999.00,
    "quantity": 1,
    "url": "https://www.tirabeauty.com/product/lipstick-red"
  }
]
```

**Address JSONB Structure:**
```json
{
  "id": 1,
  "name": "Home",
  "street": "123 Main Street",
  "city": "Mumbai",
  "state": "Maharashtra",
  "pincode": "400001",
  "phone": "+91 9876543210"
}
```

---

### order_logs

Detailed execution logs for orders.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | SERIAL | PRIMARY KEY | Auto-incrementing ID |
| `order_id` | INTEGER | FOREIGN KEY → orders(id), NULL | Associated order (if any) |
| `user_id` | INTEGER | | User ID for the log |
| `level` | VARCHAR(20) | NOT NULL | Log level |
| `message` | TEXT | NOT NULL | Log message |
| `timestamp` | TIMESTAMP | DEFAULT NOW() | Log timestamp |

**Indexes:**
- PRIMARY KEY on `id`
- FOREIGN KEY on `order_id` REFERENCES `orders(id)` ON DELETE CASCADE
- INDEX on `timestamp` DESC
- INDEX on `level`

**Log Levels:**
- `DEBUG`
- `INFO`
- `WARNING`
- `ERROR`
- `CRITICAL`

---

## Database Initialization

Run the initialization script to create all tables:

```bash
cd backend
python scripts/init_db.py
```

**Script Location:** `backend/scripts/init_db.py`

**What it does:**
1. Drops existing tables (if any)
2. Creates all tables with proper schema
3. Creates indexes
4. Inserts sample admin user
5. Optionally inserts sample data

---

## Migrations

**Current:** Manual schema updates via `init_db.py`

**Recommended for Production:** Use Alembic for database migrations

```bash
# Install Alembic
pip install alembic

# Initialize
alembic init migrations

# Create migration
alembic revision --autogenerate -m "Add new column"

# Apply migration
alembic upgrade head
```

---

## Backup & Restore

### Backup

```bash
pg_dump -U tira_admin -d tira_automation > backup.sql
```

### Restore

```bash
psql -U tira_admin -d tira_automation < backup.sql
```

---

## Performance Optimization

### Indexes

All frequently queried columns have indexes:
- `tira_users.email` (UNIQUE)
- `orders.user_id` (FOREIGN KEY)
- `orders.status`
- `orders.created_at` DESC
- `order_logs.timestamp` DESC

### JSONB Queries

For efficient JSONB queries:

```sql
-- Query cookies by name
SELECT * FROM tira_users 
WHERE cookies @> '[{"name": "f.session"}]';

-- Create GIN index for JSONB
CREATE INDEX idx_cookies_gin ON tira_users USING GIN (cookies);
```

### Connection Pooling

SQLAlchemy connection pool settings (in `database.py`):

```python
engine = create_async_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True
)
```

---

## Data Retention

**Current:** No automatic cleanup

**Recommended:**
- Archive old orders after 90 days
- Delete logs older than 30 days
- Implement scheduled cleanup job

```sql
-- Example cleanup query
DELETE FROM order_logs 
WHERE timestamp < NOW() - INTERVAL '30 days';
```

---

## Security

### Password Hashing

Admin passwords are hashed using bcrypt with cost factor 12:

```python
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
hashed = pwd_context.hash("password")
```

### SQL Injection Prevention

All queries use parameterized statements via SQLAlchemy ORM.

### Sensitive Data

- Cookies stored in JSONB (encrypted at rest recommended for production)
- Passwords never stored in plain text
- Connection strings in environment variables

---

**Last Updated:** February 2026

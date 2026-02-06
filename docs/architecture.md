# System Architecture

## Overview

The Tira Order Automation System is a full-stack application designed to automate e-commerce operations for Tira Beauty. The system follows a modern microservices-inspired architecture with clear separation between frontend, backend, and data layers.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        USER INTERFACE                        │
│                     (Next.js Frontend)                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │Dashboard │  │  Orders  │  │Checkpoint│  │  Admin   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP/REST + WebSocket
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                      API LAYER (FastAPI)                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │   Auth   │  │  Orders  │  │Checkpoint│  │WebSocket │   │
│  │  Routes  │  │  Routes  │  │  Routes  │  │  Routes  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Services   │  │  Automation  │  │   Database   │
│    Layer     │  │    Engine    │  │   (Postgres) │
│              │  │              │  │              │
│ • Auth       │  │ • Browser    │  │ • Users      │
│ • Data       │  │   Manager    │  │ • Orders     │
│ • Order      │  │ • Handlers   │  │ • Products   │
│ • Validation │  │ • Executors  │  │ • Addresses  │
└──────────────┘  └──────────────┘  └──────────────┘
                         │
                         ▼
                 ┌──────────────┐
                 │ Tira Beauty  │
                 │   Website    │
                 │ (Playwright) │
                 └──────────────┘
```

---

## Technology Stack

### Frontend Layer

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 16.1.2 | React framework with SSR/SSG |
| **React** | 19.2.3 | UI component library |
| **TypeScript** | 5.x | Type-safe JavaScript |
| **Tailwind CSS** | 4.x | Utility-first CSS framework |
| **Lucide React** | 0.563.0 | Icon library |
| **jsPDF** | 4.0.0 | PDF generation |

**Key Features:**
- Server-side rendering for optimal performance
- Type-safe API client with TypeScript
- Real-time updates via WebSocket
- Responsive design with Tailwind CSS
- Component-based architecture

### Backend Layer

| Technology | Version | Purpose |
|------------|---------|---------|
| **FastAPI** | 0.109.0 | Modern async web framework |
| **Python** | 3.11+ | Programming language |
| **Uvicorn** | 0.27.0 | ASGI server |
| **Pydantic** | 2.5.3 | Data validation |
| **SQLAlchemy** | 2.0.20 | ORM with async support |
| **Playwright** | 1.41.0 | Browser automation |
| **WebSockets** | 12.0 | Real-time communication |
| **python-jose** | 3.3.0 | JWT authentication |

**Key Features:**
- Async/await for high concurrency
- Type validation with Pydantic models
- Automatic API documentation (Swagger/OpenAPI)
- WebSocket support for real-time logs
- JWT-based authentication

### Database Layer

| Technology | Version | Purpose |
|------------|---------|---------|
| **PostgreSQL** | 14+ | Relational database |
| **asyncpg** | 0.27.1 | Async PostgreSQL driver |

**Key Features:**
- ACID compliance
- JSON/JSONB support for flexible data
- Async connection pooling
- Efficient indexing

---

## Component Architecture

### 1. Frontend Components

```
src/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Main dashboard
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles
├── components/            # React Components
│   ├── OrderAutomation.tsx
│   ├── CheckpointAutomation.tsx
│   ├── OrderHistory.tsx
│   ├── ProductManager.tsx
│   ├── AddressManager.tsx
│   └── UserRangeSelector.tsx
└── libs/                  # Utilities
    └── api.ts            # API client
```

**Component Hierarchy:**
- **Layout** → Provides navigation and global state
- **Dashboard** → Orchestrates all automation features
- **Feature Components** → Self-contained modules (Orders, Checkpoints, etc.)
- **Shared Components** → Reusable UI elements

### 2. Backend Services

```
app/
├── api/                   # API Routes
│   ├── auth.py           # Authentication endpoints
│   ├── orders.py         # Order management
│   ├── checkpoints.py    # Points tracking
│   ├── products.py       # Product CRUD
│   ├── addresses.py      # Address CRUD
│   └── websocket_routes.py
├── automation/           # Automation Logic
│   ├── browser_manager.py
│   ├── order_executor.py
│   ├── checkpoint_executor.py
│   ├── address_handler.py
│   ├── cart_handler.py
│   └── checkout_handler.py
├── services/            # Business Logic
│   ├── auth_service.py
│   ├── data_service.py
│   ├── order_service.py
│   └── validation_service.py
├── models/              # Pydantic Models
│   ├── admin.py
│   ├── order.py
│   ├── checkpoint.py
│   ├── product.py
│   └── address.py
└── utils/               # Utilities
    ├── logger.py
    ├── websocket.py
    └── helpers.py
```

---

## Data Flow

### Order Automation Flow

```
1. User Input (Frontend)
   ↓
2. API Request → POST /api/orders/execute
   ↓
3. Order Service validates request
   ↓
4. Order Executor creates background task
   ↓
5. Browser Manager launches Playwright sessions
   ↓
6. Handlers execute automation steps:
   - Login with cookies
   - Add products to cart
   - Fill address
   - Complete checkout
   ↓
7. Results saved to database
   ↓
8. WebSocket broadcasts logs to frontend
   ↓
9. Frontend displays real-time updates
```

### Checkpoint Automation Flow

```
1. User selects user range (Frontend)
   ↓
2. API Request → POST /api/checkpoints/execute
   ↓
3. Checkpoint Executor creates task
   ↓
4. For each user (concurrent):
   - Extract cookies from database
   - Make API call to Tira rewards endpoint
   - Parse JSON response for points
   - Update database with earned points
   ↓
5. Frontend polls for results
   ↓
6. Display points and tier status
```

---

## Security Architecture

### Authentication Flow

```
1. Admin Login
   ↓
2. Validate credentials (bcrypt hash)
   ↓
3. Generate JWT token
   ↓
4. Return token to frontend
   ↓
5. Frontend stores token (memory/localStorage)
   ↓
6. Include token in Authorization header
   ↓
7. Backend validates JWT on protected routes
```

### Session Management

- **Admin Sessions:** JWT tokens with expiration
- **User Sessions:** Cookies stored in database (JSONB)
- **Browser Sessions:** Playwright context with injected cookies

---

## Scalability Considerations

### Current Architecture
- **Concurrency:** Semaphore-based limiting (5 concurrent browsers)
- **Database:** Single PostgreSQL instance
- **Sessions:** In-memory task tracking

### Future Enhancements
- **Horizontal Scaling:** Deploy multiple backend instances behind load balancer
- **Queue System:** Redis/Celery for distributed task processing
- **Database:** Read replicas for analytics queries
- **Caching:** Redis for frequently accessed data
- **Monitoring:** Prometheus + Grafana for metrics

---

## Error Handling

### Frontend
- Try-catch blocks for API calls
- User-friendly error messages
- Automatic retry for failed requests

### Backend
- Global exception handlers
- Detailed error logging
- Graceful degradation
- Transaction rollback on failures

### Automation
- Retry logic for transient failures
- Screenshot capture on errors
- Detailed step-by-step logging
- Timeout handling

---

## Performance Optimization

### Frontend
- Code splitting with Next.js
- Lazy loading of components
- Optimized images and assets
- Client-side caching

### Backend
- Async I/O for all database operations
- Connection pooling
- Efficient database queries with indexes
- Background task processing

### Automation
- Concurrent browser sessions
- Cookie-based authentication (no login overhead)
- API-based checkpoints (no browser for points)
- Configurable delays to avoid rate limiting

---

## Deployment Architecture

### Development
```
localhost:3000 (Frontend)
localhost:8000 (Backend)
localhost:5432 (PostgreSQL)
```

### Production (Recommended)
```
[Load Balancer]
    ↓
[Frontend Servers (Next.js)]
    ↓
[Backend Servers (FastAPI)]
    ↓
[PostgreSQL Primary + Replicas]
```

---

## Monitoring & Logging

### Logging Strategy
- **Frontend:** Console logs + error tracking service
- **Backend:** Structured logging with colorlog
- **Database:** Query logging for slow queries
- **Automation:** Step-by-step execution logs

### Real-time Monitoring
- WebSocket for live log streaming
- Task status polling
- Order completion notifications

---

## API Design Principles

1. **RESTful:** Standard HTTP methods (GET, POST, DELETE)
2. **Consistent:** Uniform response structure
3. **Documented:** Auto-generated OpenAPI docs
4. **Versioned:** Future-proof with API versioning
5. **Secure:** JWT authentication on protected routes

---

## Future Roadmap

- [ ] Multi-tenancy support
- [ ] Advanced analytics dashboard
- [ ] Webhook integrations
- [ ] Mobile app (React Native)
- [ ] AI-powered order optimization
- [ ] Distributed task queue (Celery)
- [ ] Kubernetes deployment
- [ ] CI/CD pipeline

---

**Last Updated:** February 2026

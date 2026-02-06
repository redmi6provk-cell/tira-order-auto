# Directory Structure

Complete directory structure and file organization for the Tira Order Automation System.

---

## Root Directory

```
tira-order-auto/
├── backend/                 # FastAPI backend application
├── frontend/                # Next.js frontend application
├── docs/                    # Project documentation
├── .git/                    # Git repository
└── README.md                # Main project documentation
```

---

## Backend Structure

```
backend/
├── app/                     # Main application package
│   ├── __init__.py
│   ├── main.py             # FastAPI app entry point
│   ├── config.py           # Configuration settings
│   ├── database.py         # Database connection
│   │
│   ├── api/                # API route handlers
│   │   ├── __init__.py
│   │   ├── auth.py         # Authentication endpoints
│   │   ├── orders.py       # Order management endpoints
│   │   ├── checkpoints.py  # Checkpoint endpoints
│   │   ├── products.py     # Product CRUD endpoints
│   │   ├── addresses.py    # Address CRUD endpoints
│   │   ├── automation.py   # Automation control endpoints
│   │   └── websocket_routes.py  # WebSocket endpoints
│   │
│   ├── automation/         # Browser automation logic
│   │   ├── __init__.py
│   │   ├── browser_manager.py    # Playwright browser management
│   │   ├── order_executor.py     # Order automation orchestrator
│   │   ├── checkpoint_executor.py # Points checking orchestrator
│   │   ├── address_handler.py    # Address form automation
│   │   ├── cart_handler.py       # Cart management automation
│   │   └── checkout_handler.py   # Checkout automation
│   │
│   ├── models/             # Pydantic data models
│   │   ├── __init__.py
│   │   ├── admin.py        # Admin user models
│   │   ├── order.py        # Order-related models
│   │   ├── checkpoint.py   # Checkpoint models
│   │   ├── product.py      # Product models
│   │   └── address.py      # Address models
│   │
│   ├── services/           # Business logic layer
│   │   ├── __init__.py
│   │   ├── auth_service.py       # Authentication logic
│   │   ├── data_service.py       # Database operations
│   │   ├── order_service.py      # Order business logic
│   │   └── validation_service.py # Input validation
│   │
│   └── utils/              # Utility functions
│       ├── __init__.py
│       ├── logger.py       # Logging configuration
│       ├── websocket.py    # WebSocket manager
│       └── helpers.py      # Helper functions
│
├── scripts/                # Utility scripts
│   └── init_db.py         # Database initialization
│
├── data/                   # Data directory (gitignored)
│   └── orders/            # Order history files
│
├── logs/                   # Log files (gitignored)
│
├── venv/                   # Python virtual environment (gitignored)
│
├── .env                    # Environment variables (gitignored)
├── .gitignore             # Git ignore rules
├── requirements.txt       # Python dependencies
└── README.md              # Backend-specific documentation
```

---

## Frontend Structure

```
frontend/
├── src/                    # Source code
│   ├── app/               # Next.js App Router
│   │   ├── page.tsx       # Main dashboard page
│   │   ├── layout.tsx     # Root layout component
│   │   ├── globals.css    # Global styles
│   │   └── favicon.ico    # Favicon
│   │
│   ├── components/        # React components
│   │   ├── OrderAutomation.tsx      # Order automation UI
│   │   ├── CheckpointAutomation.tsx # Checkpoint automation UI
│   │   ├── OrderHistory.tsx         # Order history table
│   │   ├── ProductManager.tsx       # Product management UI
│   │   ├── AddressManager.tsx       # Address management UI
│   │   ├── UserRangeSelector.tsx    # User range input
│   │   └── LoginForm.tsx            # Admin login form
│   │
│   └── libs/              # Utilities and libraries
│       └── api.ts         # API client with TypeScript types
│
├── public/                # Static assets
│   ├── images/           # Image files
│   └── icons/            # Icon files
│
├── .next/                # Next.js build output (gitignored)
├── node_modules/         # NPM dependencies (gitignored)
│
├── .gitignore           # Git ignore rules
├── package.json         # NPM dependencies and scripts
├── package-lock.json    # NPM lock file
├── tsconfig.json        # TypeScript configuration
├── next.config.ts       # Next.js configuration
├── tailwind.config.ts   # Tailwind CSS configuration
├── postcss.config.mjs   # PostCSS configuration
└── eslint.config.mjs    # ESLint configuration
```

---

## Documentation Structure

```
docs/
├── architecture.md      # System architecture and design
├── api.md              # API reference documentation
├── database.md         # Database schema documentation
├── directory.md        # This file - directory structure
├── deployment.md       # Deployment guide
└── development.md      # Development guide
```

---

## Key Files Explained

### Backend

#### `app/main.py`
FastAPI application entry point. Configures:
- CORS middleware
- API routers
- WebSocket routes
- Startup/shutdown events
- Static file serving

#### `app/config.py`
Application configuration using Pydantic Settings:
- API host/port
- Database URL
- Automation settings
- Logging configuration
- File paths

#### `app/database.py`
Database connection management:
- Async SQLAlchemy engine
- Session factory
- Connection pooling

#### `app/automation/order_executor.py`
Order automation orchestrator:
- Task management
- Browser session coordination
- Result aggregation
- Error handling

#### `app/automation/checkpoint_executor.py`
Checkpoint automation orchestrator:
- API-based points checking
- Concurrent user processing
- Database persistence
- 5-second delay between requests

#### `app/services/data_service.py`
Database operations:
- User CRUD
- Product CRUD
- Address CRUD
- Order CRUD
- Query helpers

#### `app/utils/logger.py`
Logging configuration:
- Colorlog setup
- Log levels
- File/console handlers

#### `app/utils/websocket.py`
WebSocket manager:
- Client connection management
- Message broadcasting
- Connection cleanup

### Frontend

#### `src/app/page.tsx`
Main dashboard page:
- Tab navigation
- Component orchestration
- Authentication check

#### `src/app/layout.tsx`
Root layout:
- HTML structure
- Global providers
- Font loading
- Metadata

#### `src/components/OrderAutomation.tsx`
Order automation interface:
- User range selection
- Product selection
- Address selection
- Real-time status updates
- WebSocket log streaming

#### `src/components/CheckpointAutomation.tsx`
Checkpoint automation interface:
- User range selection
- Task status polling
- Results display
- Points visualization

#### `src/components/OrderHistory.tsx`
Order history table:
- Filterable table
- PDF export
- Clear history
- Status indicators

#### `src/libs/api.ts`
API client:
- TypeScript interfaces
- HTTP request functions
- Error handling
- Authentication headers

---

## File Naming Conventions

### Backend (Python)
- **Modules:** `snake_case.py`
- **Classes:** `PascalCase`
- **Functions:** `snake_case()`
- **Constants:** `UPPER_SNAKE_CASE`

### Frontend (TypeScript/React)
- **Components:** `PascalCase.tsx`
- **Utilities:** `camelCase.ts`
- **Types:** `PascalCase` (interfaces/types)
- **Functions:** `camelCase()`
- **Constants:** `UPPER_SNAKE_CASE`

---

## Ignored Files (.gitignore)

### Backend
```
venv/
__pycache__/
*.pyc
.env
data/
logs/
*.log
.DS_Store
```

### Frontend
```
node_modules/
.next/
out/
.env.local
.DS_Store
*.log
```

---

## Import Structure

### Backend

```python
# Standard library
import asyncio
from typing import List, Dict

# Third-party
from fastapi import APIRouter, Depends
from sqlalchemy import select

# Local application
from app.models.order import OrderRequest
from app.services.data_service import user_service
from app.utils.logger import get_logger
```

### Frontend

```typescript
// React
import React, { useState, useEffect } from 'react';

// Next.js
import Link from 'next/link';

// Third-party
import { Play, Loader2 } from 'lucide-react';

// Local
import { api, OrderRequest } from '@/libs/api';
import UserRangeSelector from '@/components/UserRangeSelector';
```

---

## Configuration Files

### Backend

**requirements.txt**
- Python package dependencies
- Pinned versions for reproducibility

**.env**
- Environment-specific configuration
- Secrets and credentials
- Never committed to git

### Frontend

**package.json**
- NPM dependencies
- Build scripts
- Project metadata

**tsconfig.json**
- TypeScript compiler options
- Path aliases (@/ for src/)

**tailwind.config.ts**
- Tailwind CSS customization
- Theme configuration
- Plugin setup

**next.config.ts**
- Next.js configuration
- Build settings
- Environment variables

---

## Build Artifacts

### Backend
- `__pycache__/` - Python bytecode cache
- `logs/` - Application logs
- `data/` - Runtime data files

### Frontend
- `.next/` - Next.js build output
- `out/` - Static export (if used)
- `node_modules/` - NPM packages

---

## Adding New Features

### Backend Endpoint

1. Create model in `app/models/`
2. Add service logic in `app/services/`
3. Create API route in `app/api/`
4. Register router in `app/main.py`

### Frontend Component

1. Create component in `src/components/`
2. Add API function in `src/libs/api.ts`
3. Import and use in page/layout

### Automation Handler

1. Create handler in `app/automation/`
2. Integrate with executor
3. Add error handling
4. Update logging

---

**Last Updated:** February 2026

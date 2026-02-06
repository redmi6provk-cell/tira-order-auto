# Development Guide

Developer guide for contributing to the Tira Order Automation System.

---

## Getting Started

### Prerequisites

- **Python:** 3.11+
- **Node.js:** 20.x LTS
- **PostgreSQL:** 14+
- **Git:** Latest version
- **Code Editor:** VS Code (recommended)

### Recommended VS Code Extensions

- **Python:** ms-python.python
- **Pylance:** ms-python.vscode-pylance
- **ESLint:** dbaeumer.vscode-eslint
- **Tailwind CSS IntelliSense:** bradlc.vscode-tailwindcss
- **TypeScript:** Built-in
- **GitLens:** eamodio.gitlens

---

## Local Development Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd tira-order-auto
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Install Playwright browsers
playwright install chromium

# Create .env file
copy .env.example .env  # Windows
cp .env.example .env    # macOS/Linux

# Edit .env with your settings
```

**Development .env:**
```env
API_HOST=0.0.0.0
API_PORT=8000
DATABASE_URL=postgresql+asyncpg://tira_admin:tira@localhost:5432/tira_automation
MAX_CONCURRENT_BROWSERS=3
HEADLESS_MODE=false
LOG_LEVEL=DEBUG
```

```bash
# Initialize database
python scripts/init_db.py

# Run development server
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

**Access the application:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

---

## Development Workflow

### Branch Strategy

```
main (production)
  ├── develop (integration)
  │   ├── feature/order-automation
  │   ├── feature/checkpoint-api
  │   └── bugfix/login-issue
  └── hotfix/critical-bug
```

### Creating a Feature

```bash
# Create feature branch from develop
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name

# Make changes
# ... code ...

# Commit changes
git add .
git commit -m "feat: add new feature"

# Push to remote
git push origin feature/your-feature-name

# Create Pull Request on GitHub/GitLab
```

### Commit Message Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(orders): add bulk order cancellation
fix(auth): resolve JWT token expiration issue
docs(api): update endpoint documentation
refactor(database): optimize user query performance
```

---

## Code Style Guidelines

### Python (Backend)

Follow [PEP 8](https://peps.python.org/pep-0008/) style guide.

**Formatting:**
```bash
# Install black and flake8
pip install black flake8

# Format code
black app/

# Lint code
flake8 app/
```

**Example:**
```python
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from app.models.order import OrderRequest, OrderResponse
from app.services.data_service import order_service


router = APIRouter(prefix="/api/orders", tags=["orders"])


@router.post("/execute", response_model=OrderResponse)
async def execute_order(
    request: OrderRequest,
    current_user: dict = Depends(get_current_user)
) -> OrderResponse:
    """
    Execute automated order placement.
    
    Args:
        request: Order execution request
        current_user: Authenticated user
        
    Returns:
        OrderResponse with session ID
        
    Raises:
        HTTPException: If validation fails
    """
    try:
        result = await order_service.execute(request)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

### TypeScript (Frontend)

Follow [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript).

**Formatting:**
```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint -- --fix
```

**Example:**
```typescript
import React, { useState, useEffect } from 'react';
import { api, OrderRequest, OrderResponse } from '@/libs/api';

interface OrderAutomationProps {
  onComplete?: (result: OrderResponse) => void;
}

export default function OrderAutomation({ onComplete }: OrderAutomationProps) {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const handleStart = async () => {
    setIsProcessing(true);
    
    try {
      const response = await api.orders.execute({
        user_range_start: 1,
        user_range_end: 5,
        product_ids: [101],
        address_id: 1,
      });
      
      setSessionId(response.session_id);
      onComplete?.(response);
    } catch (error) {
      console.error('Order execution failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <button onClick={handleStart} disabled={isProcessing}>
        {isProcessing ? 'Processing...' : 'Start Order'}
      </button>
    </div>
  );
}
```

---

## Testing

### Backend Tests

```bash
# Install pytest
pip install pytest pytest-asyncio pytest-cov

# Run tests
pytest

# Run with coverage
pytest --cov=app tests/

# Run specific test
pytest tests/test_orders.py::test_create_order
```

**Example Test:**
```python
import pytest
from app.services.data_service import order_service


@pytest.mark.asyncio
async def test_create_order():
    """Test order creation"""
    order_data = {
        "user_id": 1,
        "product_ids": [101],
        "address_id": 1,
    }
    
    result = await order_service.create(order_data)
    
    assert result.id is not None
    assert result.status == "pending"
```

### Frontend Tests

```bash
# Install testing libraries
npm install --save-dev @testing-library/react @testing-library/jest-dom

# Run tests
npm test

# Run with coverage
npm test -- --coverage
```

---

## Database Migrations

### Using Alembic (Recommended for Production)

```bash
# Install Alembic
pip install alembic

# Initialize
alembic init migrations

# Create migration
alembic revision --autogenerate -m "Add user points column"

# Apply migration
alembic upgrade head

# Rollback migration
alembic downgrade -1
```

### Manual Schema Updates (Development)

```bash
# Edit scripts/init_db.py
# Run initialization script
python scripts/init_db.py
```

---

## Debugging

### Backend Debugging

**VS Code launch.json:**
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Python: FastAPI",
      "type": "python",
      "request": "launch",
      "module": "uvicorn",
      "args": [
        "app.main:app",
        "--reload",
        "--host", "0.0.0.0",
        "--port", "8000"
      ],
      "jinja": true,
      "justMyCode": false,
      "cwd": "${workspaceFolder}/backend"
    }
  ]
}
```

**Logging:**
```python
from app.utils.logger import get_logger

logger = get_logger(__name__)

logger.debug("Debug message")
logger.info("Info message")
logger.warning("Warning message")
logger.error("Error message")
```

### Frontend Debugging

**Browser DevTools:**
- Chrome DevTools (F12)
- React Developer Tools extension
- Network tab for API calls

**Console Logging:**
```typescript
console.log('Debug:', data);
console.error('Error:', error);
```

---

## API Development

### Adding a New Endpoint

1. **Create Pydantic Model** (`app/models/`)
```python
from pydantic import BaseModel

class NewFeatureRequest(BaseModel):
    name: str
    value: int

class NewFeatureResponse(BaseModel):
    id: int
    name: str
    value: int
```

2. **Add Service Logic** (`app/services/`)
```python
async def create_feature(data: NewFeatureRequest) -> NewFeatureResponse:
    # Business logic here
    return NewFeatureResponse(id=1, name=data.name, value=data.value)
```

3. **Create API Route** (`app/api/`)
```python
from fastapi import APIRouter
from app.models.new_feature import NewFeatureRequest, NewFeatureResponse

router = APIRouter(prefix="/api/features", tags=["features"])

@router.post("/", response_model=NewFeatureResponse)
async def create_feature(request: NewFeatureRequest):
    result = await feature_service.create(request)
    return result
```

4. **Register Router** (`app/main.py`)
```python
from app.api import features

app.include_router(features.router)
```

---

## Frontend Development

### Adding a New Component

1. **Create Component** (`src/components/NewComponent.tsx`)
```typescript
import React from 'react';

interface NewComponentProps {
  title: string;
}

export default function NewComponent({ title }: NewComponentProps) {
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold">{title}</h2>
    </div>
  );
}
```

2. **Add API Function** (`src/libs/api.ts`)
```typescript
export const api = {
  // ... existing APIs
  newFeature: {
    create: async (data: NewFeatureRequest): Promise<NewFeatureResponse> => {
      const response = await fetch(`${API_BASE_URL}/api/features`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return response.json();
    },
  },
};
```

3. **Use in Page** (`src/app/page.tsx`)
```typescript
import NewComponent from '@/components/NewComponent';

export default function Page() {
  return (
    <div>
      <NewComponent title="My Feature" />
    </div>
  );
}
```

---

## Performance Optimization

### Backend

- Use async/await for I/O operations
- Implement database connection pooling
- Add indexes to frequently queried columns
- Use pagination for large datasets
- Cache frequently accessed data

### Frontend

- Use React.memo for expensive components
- Implement lazy loading
- Optimize images (WebP, compression)
- Code splitting with dynamic imports
- Minimize bundle size

---

## Common Issues & Solutions

### Issue: Database Connection Error

**Solution:**
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check connection string in .env
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/dbname
```

### Issue: Playwright Browser Not Found

**Solution:**
```bash
# Reinstall browsers
playwright install chromium
playwright install-deps
```

### Issue: Frontend Build Fails

**Solution:**
```bash
# Clear cache and reinstall
rm -rf node_modules .next
npm install
npm run build
```

---

## Resources

### Documentation
- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [Next.js Docs](https://nextjs.org/docs)
- [Playwright Docs](https://playwright.dev/)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)

### Tools
- [Postman](https://www.postman.com/) - API testing
- [DBeaver](https://dbeaver.io/) - Database management
- [VS Code](https://code.visualstudio.com/) - Code editor

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write/update tests
5. Update documentation
6. Submit a pull request

### Pull Request Checklist

- [ ] Code follows style guidelines
- [ ] Tests pass
- [ ] Documentation updated
- [ ] Commit messages follow convention
- [ ] No merge conflicts
- [ ] Reviewed by at least one team member

---

**Last Updated:** February 2026

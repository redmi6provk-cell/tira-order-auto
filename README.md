# Tira Order Automation System

> **Enterprise-grade automation platform for Tira Beauty e-commerce operations**

A full-stack application that automates order placement, user management, and loyalty points tracking for Tira Beauty's e-commerce platform. Built with modern technologies and designed for scalability, reliability, and ease of use.

---

## 🚀 Quick Start

```bash
# Backend (FastAPI)
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000

# Frontend (Next.js)
cd frontend
npm install
npm run dev
```

**Access the application:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

---

## 📚 Documentation

Comprehensive documentation is available in the [`docs/`](./docs) directory:

| Document | Description |
|----------|-------------|
| [**Architecture**](./docs/architecture.md) | System design, tech stack, and component interactions |
| [**API Reference**](./docs/api.md) | Complete API endpoints documentation with examples |
| [**Database Schema**](./docs/database.md) | Database structure, tables, and relationships |
| [**Directory Structure**](./docs/directory.md) | Project organization and file structure |
| [**Deployment Guide**](./docs/deployment.md) | Production deployment instructions |
| [**Development Guide**](./docs/development.md) | Setup, workflows, and contribution guidelines |

---

## ✨ Key Features

### 🛒 **Order Automation**
- Automated order placement with configurable products and addresses
- Multi-user support with concurrent browser sessions
- Real-time order tracking and status updates
- PDF export of order history

### 👥 **User Management**
- Bulk user registration and cookie management
- Session persistence and authentication
- User range selection for batch operations

### 🎁 **Loyalty Points Tracking (Checkpoints)**
- Automated Tira Treats points extraction via API
- Real-time points monitoring across multiple users
- Tier status tracking (Fan, Muse, All Star)
- Database persistence for historical tracking

### 📊 **Admin Dashboard**
- Real-time WebSocket logging
- Order history with advanced filtering
- Product and address management
- Comprehensive analytics and reporting

---

## 🛠️ Tech Stack

### Backend
- **Framework:** FastAPI 0.109.0
- **Database:** PostgreSQL with SQLAlchemy (async)
- **Automation:** Playwright 1.41.0
- **Real-time:** WebSockets
- **Authentication:** JWT with python-jose

### Frontend
- **Framework:** Next.js 16.1.2 (React 19)
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS 4
- **UI Components:** Lucide React icons
- **PDF Generation:** jsPDF

---

## 📁 Project Structure

```
tira-order-auto/
├── backend/              # FastAPI backend
│   ├── app/
│   │   ├── api/         # API route handlers
│   │   ├── automation/  # Browser automation logic
│   │   ├── models/      # Pydantic models
│   │   ├── services/    # Business logic
│   │   └── utils/       # Utilities and helpers
│   ├── scripts/         # Database initialization
│   └── requirements.txt
├── frontend/            # Next.js frontend
│   ├── src/
│   │   ├── app/        # Next.js app router
│   │   ├── components/ # React components
│   │   └── libs/       # API client and utilities
│   └── package.json
└── docs/               # Documentation
```

For detailed structure, see [Directory Structure](./docs/directory.md).

---

## 🔐 Security & Authentication

- **Admin Authentication:** JWT-based with secure password hashing
- **Session Management:** Cookie-based authentication for Tira platform
- **Environment Variables:** Sensitive data stored in `.env` files
- **Database Security:** Parameterized queries to prevent SQL injection

---

## 📊 Database

**PostgreSQL** database with the following main tables:
- `admin_users` - Admin authentication
- `tira_users` - User accounts with cookies and points
- `products` - Product catalog
- `addresses` - Delivery addresses
- `orders` - Order history and tracking
- `order_logs` - Detailed execution logs

See [Database Schema](./docs/database.md) for complete details.

---

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/login` - Admin login
- `GET /api/auth/me` - Get current user

### Orders
- `POST /api/orders/execute` - Execute order automation
- `GET /api/orders` - Get order history
- `DELETE /api/orders/clear` - Clear order history

### Checkpoints
- `POST /api/checkpoints/execute` - Run points check
- `GET /api/checkpoints/results/{task_id}` - Get results
- `GET /api/checkpoints/status/{task_id}` - Get task status

See [API Reference](./docs/api.md) for complete documentation.

---

## 🚀 Deployment

### Prerequisites
- Python 3.11+
- Node.js 20+
- PostgreSQL 14+
- Playwright browsers

### Production Deployment
1. Set up PostgreSQL database
2. Configure environment variables
3. Install dependencies
4. Initialize database schema
5. Run backend and frontend services

See [Deployment Guide](./docs/deployment.md) for detailed instructions.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

See [Development Guide](./docs/development.md) for coding standards and workflows.

---

## 📝 License

This project is proprietary software. All rights reserved.

---

## 📧 Support

For issues, questions, or contributions, please contact the development team.

---

**Built with ❤️ for Tira Beauty automation**

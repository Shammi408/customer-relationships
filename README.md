# Customer Relationships CRM (Full-Stack MERN + Postgres + Prisma)

A full-featured Customer Relationship Management system with role-based access, activity tracking, audit logs, lead management, real-time updates, authentication, analytics, and more.

This project is built as part of the Masters' Union assignment and includes a complete production-ready backend (Express + Postgres + Prisma) and frontend (React + Vite), with optional Docker support.

---

# 🚀 Live Demo Links
(To be added after deployment)

- **Frontend (Vercel)** →  
- **Backend API (Render)** →  
- **Database** → Render Managed Postgres

---

# 🧩 Tech Stack

## **Backend**
- Node.js + Express
- PostgreSQL
- Prisma ORM
- JWT Authentication
- Socket.IO (live updates)
- Role-Based Access Control (ADMIN, MANAGER, SALES_EXEC)
- Pagination, filtering, audit logging

## **Frontend**
- React + Vite
- Context-based Auth
- Axios API client
- TailwindCSS UI
- Real-time updates via WebSockets

## **Other**
- Jest / Supertest (tests for at least 1 module)
- Deployment on Vercel + Render
- Optional Docker setup (bonus)

---

## 📂 Project Structure
    customer-relationships/
    │
    ├── backend/
    │ ├── src/
    │ ├── prisma/
    │ │ ├── schema.prisma
    │ │ └── migrations/
    │ ├── package.json
    │ └── .env.example
    │
    ├── frontend/
    │ ├── src/
    │ ├── index.html
    │ ├── package.json
    │ └── .env.example
    │
    ├── README.md
    └── .gitignore



#  Environment Variables

## **Backend – `backend/.env.example`**
    DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DBNAME?schema=public
    JWT_SECRET=your_jwt_secret_here
    PORT=3000
    CORS_ORIGIN=http://localhost:5173


## **Frontend – `frontend/.env.example`**
    VITE_API_URL=http://localhost:3000


---

# Setup (Local Development)

1. Clone the repository
    ```bash
    git clone https://github.com/<your-username>/customer-relationships.git
    cd customer-relationships

2. Install dependencies
Backend:
    cd backend
    npm install

Frontend:
    cd ../frontend
    npm install

3. Create .env files

    Copy .env.example → .env in both backend/ and frontend/.
    Update DATABASE_URL to your local Postgres connection.

4. Setup the database (Prisma)

    From the backend/ folder:
    npx prisma migrate dev

    This will:
    Create tables
    Apply migrations
    Generate Prisma client

    You can visualize DB using:
    npx prisma studio

5. Start backend

cd backend
npm run dev
Backend runs at http://localhost:3000

6. Start frontend

cd frontend
npm run dev
Frontend runs at http://localhost:5173

Features
    Leads Management

        Create, update, assign, filter
        Status tracking
        Activities (calls, meetings, notes)

    Authentication + RBAC

        Admin: Full access
        Manager: Team oversight + logs
        Sales Exec: Only own leads & own logs

    Audit Logs

        Each action recorded (create/update/delete/login)
        Admin/Manager view all logs
        Users view their own logs (/mine)

    Real-Time Updates
        Socket.IO updates on lead changes & activity creation

    CRM Dashboard (Analytics)

    Pagination + Filters
        Leads
        Activities
        Logs

Tests 

    This project includes placeholder support for Jest / Supertest.
    Example test command:

    cd backend
    npm test

Deployment
    Backend (Render)

    Create a Web Service
    Add environment variables (DATABASE_URL, JWT_SECRET, PORT)
    Add a managed Postgres DB
    Set Start Command:
    sh -lc "npx prisma migrate deploy && npm start"


    Deploy

    Frontend (Vercel)
    Import repo
    Set root directory to frontend/

    Add env:
    VITE_API_URL=https://<your-backend-url>


    Build command:

    npm run build
    Output directory: dist



📝 License

This project is built for educational purposes (Masters' Union).

👤 Author

Shubhendu Shekhar
Frontend + Backend Developer


# Library Portal

A full-stack library management system designed for students, librarians, and administrators to seamlessly manage books, borrowings, requests, and reservations.

---

## 🌐 Live Deployment

- **Frontend URL:** [https://library-portal-frontend-8mbr.onrender.com/](https://library-portal-frontend-8mbr.onrender.com/)

---

## 👥 Demo Credentials

Use the following test credentials to log in and explore different roles in the application:

### 1. Admin
- **Username:** `admin`
- **Password:** `admin123`

### 2. Library (Staff)
- **Username:** `libtest1`
- **Password:** `1234`

### 3. Student
- **Username:** `test1`
- **Password:** `1234`

---

## 🛠️ Tech Stack

- **Frontend:** React, React Router, Vite, Lucide Icons, CSS
- **Backend:** Node.js, Express.js, Express Session, Connect Mongo, Argon2
- **Database:** MongoDB Atlas
- **Hosting / Deployment:** Render

---

## 💻 Local Setup & Development

### 1. Clone the repository
```bash
git clone <repository-url>
cd Library-Portal
```

### 2. Backend Setup
```bash
cd backend
npm install
```
Create a `.env` file in the `backend` folder:
```env
SESSION_SECRET='library-portal-secret'
DB_NAME='library-portal'
MONGODB_URI='<your-mongodb-atlas-uri>'
PORT=3000
CLIENT_URLS='http://localhost:5173,http://localhost:5174'
```
Start the backend server:
```bash
npm run dev
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
```
Create a `.env` file in the `frontend` folder:
```env
VITE_API_BASE_URL='http://localhost:3000'
```
Start the frontend dev server:
```bash
npm run dev
```


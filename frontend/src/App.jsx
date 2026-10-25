import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Home from "./pages/Home";
import Browse from "./pages/Browse";
import "./App.css";
import AddBook from "./pages/admin/AddBook";
import EditBook from "./pages/admin/EditBook";
import Hold from "./pages/admin/Hold";
import Users from "./pages/admin/Users";
import StudentBook from "./pages/student/Book";
import Library from "./pages/student/Library";
import LibraryBorrow from "./pages/library/Borrow";
import LibraryReserve from "./pages/library/Reserve";
import HistoryDispatcher from "./pages/HistoryDispatcher";
import OverdueDispatcher from "./pages/OverdueDispatcher";
import Account from "./pages/Account";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Base route renders Login */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />}>
          <Route index element={<Home />} />
          <Route path="home" element={<Home />} />
          <Route path="browse" element={<Browse />} />
          <Route path="add-book" element={<AddBook />} />
          <Route path="edit-book" element={<EditBook />} />
          <Route path="hold" element={<Hold />} />
          <Route path="users" element={<Users />} />
          <Route path="book/:id" element={<StudentBook />} />
          <Route path="library" element={<Library />} />
          <Route path="borrows" element={<LibraryBorrow />} />
          <Route path="reserves" element={<LibraryReserve />} />
          <Route path="history" element={<HistoryDispatcher />} />
          <Route path="overdue" element={<OverdueDispatcher />} />
          <Route path="account" element={<Account />} />
        </Route>

        {/* Global route for /library (with dashboard layout) */}
        <Route path="/library" element={<Dashboard />}>
          <Route index element={<Library />} />
        </Route>


        {/* Fallback to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

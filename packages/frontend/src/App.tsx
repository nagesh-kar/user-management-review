import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import LoginForm from "./components/LoginForm";
import UserList from "./components/UserList";
import UserProfile from "./components/UserProfile";
import Navigation from "./components/Navigation";

function App() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div>
      {isAuthenticated && <Navigation />}
      <div className="container">
        <Routes>
          <Route
            path="/login"
            element={
              isAuthenticated ? <Navigate to="/users" replace /> : <LoginForm />
            }
          />
          <Route
            path="/users"
            element={
              isAuthenticated ? <UserList /> : <Navigate to="/login" replace />
            }
          />
          <Route
            path="/users/:id"
            element={
              isAuthenticated ? (
                <UserProfile />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/profile"
            element={
              isAuthenticated ? (
                <UserProfile />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/"
            element={
              <Navigate to={isAuthenticated ? "/users" : "/login"} replace />
            }
          />
        </Routes>
      </div>
    </div>
  );
}

export default App;

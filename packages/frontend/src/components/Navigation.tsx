import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

function Navigation() {
  const { user, logout, canAccessAdminFeatures } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="nav">
      <div>
        <Link to="/users">Users</Link>
        <Link to="/profile">Profile</Link>
        {canAccessAdminFeatures() && <Link to="/admin">Admin</Link>}
      </div>
      <div>
        <span style={{ color: "white", marginRight: "20px" }}>
          {user?.firstName} {user?.lastName}
        </span>
        <button className="btn btn-secondary" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </nav>
  );
}

export default Navigation;

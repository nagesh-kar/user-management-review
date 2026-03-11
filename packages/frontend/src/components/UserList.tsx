import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { UserResponse } from "@user-management/shared";
import { usersApi, ApiError } from "../services/api";
import { useAuth } from "../hooks/useAuth";

function UserList() {
  const { canAccessAdminFeatures } = useAuth();
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  const loadUsers = useCallback(async (pageNum: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await usersApi.list(pageNum);
      setUsers(response.data);
      setHasMore(response.hasMore);
      setTotal(response.total);
      setPage(pageNum);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to load users");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers(1);
  }, [loadUsers]);

  const handleDelete = async (userId: string) => {
    if (!window.confirm("Are you sure you want to delete this user?")) {
      return;
    }

    try {
      await usersApi.delete(userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setTotal((prev) => prev - 1);
    } catch (err) {
      if (err instanceof ApiError) {
        alert(err.message);
      } else {
        alert("Failed to delete user");
      }
    }
  };

  if (isLoading && users.length === 0) {
    return <div className="loading">Loading users...</div>;
  }

  if (error && users.length === 0) {
    return (
      <div className="card">
        <div className="error-message">{error}</div>
        <button className="btn btn-primary" onClick={() => loadUsers(1)}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Users ({total})</h1>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Roles</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>
                  {user.firstName} {user.lastName}
                </td>
                <td>{user.email}</td>
                <td>
                  {user.roles.map((role) => (
                    <span
                      key={role}
                      className="badge badge-info"
                      style={{ marginRight: "4px" }}
                    >
                      {role}
                    </span>
                  ))}
                </td>
                <td>
                  <span
                    className={`badge ${user.isActive ? "badge-success" : "badge-danger"}`}
                  >
                    {user.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td>
                  <Link
                    to={`/users/${user.id}`}
                    className="btn btn-secondary"
                    style={{ marginRight: "8px" }}
                  >
                    View
                  </Link>
                  {canAccessAdminFeatures() && (
                    <button
                      className="btn btn-danger"
                      onClick={() => handleDelete(user.id)}
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {(hasMore || page > 1) && (
          <div style={{ marginTop: "20px", display: "flex", gap: "10px" }}>
            <button
              className="btn btn-secondary"
              disabled={page === 1}
              onClick={() => loadUsers(page - 1)}
            >
              Previous
            </button>
            <span style={{ alignSelf: "center" }}>Page {page}</span>
            <button
              className="btn btn-secondary"
              disabled={!hasMore}
              onClick={() => loadUsers(page + 1)}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default UserList;

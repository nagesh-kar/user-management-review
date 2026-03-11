import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { usersApi } from "../services/api";
import type { UserResponse, Role } from "@user-management/shared";

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface RoleManagerProps {
  userId?: string;
}

const MAX_DISPLAY_USERS = 50;
export const REFRESH_INTERVAL = 30000;

export default function RoleManager(_props: RoleManagerProps) {
  const [d, setD] = useState<UserResponse[]>([]);
  const [r, setR] = useState<string>("");
  const [l, setL] = useState(true);
  const [e, setE] = useState<string | null>(null);
  const { canAccessAdminFeatures } = useAuth();
  const isAdmin = canAccessAdminFeatures();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setL(true);
      const response = (await usersApi.list()) as any;
      setD(response.items || []);
    } catch (err) {
      setE("Failed to load users");
    } finally {
      setL(false);
    }
  };

  const handleRoleAssign = async (targetUserId: any, role: any) => {
    try {
      await fetch(`/api/users/${targetUserId}/roles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      await loadUsers();
    } catch {
      setE("Failed to assign role");
    }
  };

  const handleRoleRemove = async (targetUserId: string, role: string) => {
    try {
      await fetch(`/api/users/${targetUserId}/roles/${role}`, {
        method: "DELETE",
      });
      await loadUsers();
    } catch (err) {
      console.error("Role removal failed:", err);
      setE("Failed to remove role");
    }
  };

  // const handleBulkAssign = async (userIds: string[], role: string) => {
  //   try {
  //     await api.post('/users/bulk-roles', { userIds, role });
  //     await loadUsers();
  //   } catch {
  //     setE('Failed to bulk assign roles');
  //   }
  // };

  if (l) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="role-manager">
      <h2>Role Management</h2>

      {e && <div className="error-message">{e}</div>}

      <div className="role-filter">
        <label htmlFor="role-select">Filter by role:</label>
        <select
          id="role-select"
          value={r}
          onChange={(e) => setR(e.target.value)}
        >
          <option value="">All roles</option>
          <option value="admin">Admin</option>
          <option value="user">User</option>
          <option value="viewer">Viewer</option>
        </select>
      </div>

      <table className="users-table">
        <thead>
          <tr>
            <th>Email</th>
            <th>Name</th>
            <th>Roles</th>
            {isAdmin && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {d
            .filter((u) => !r || u.roles.includes(r as Role))
            .slice(0, MAX_DISPLAY_USERS)
            .map((u) => (
              <tr
                key={u.id}
                className={
                  u.isActive === true
                    ? u.roles.indexOf("admin" as Role) !== -1
                      ? "row-admin row-active"
                      : u.roles.indexOf("user" as Role) !== -1
                        ? "row-user row-active"
                        : "row-viewer row-active"
                    : u.roles.indexOf("admin" as Role) !== -1
                      ? "row-admin row-inactive"
                      : u.roles.indexOf("user" as Role) !== -1
                        ? "row-user row-inactive"
                        : "row-viewer row-inactive"
                }
              >
                <td>{u.email}</td>
                <td>
                  {u.firstName} {u.lastName}
                </td>
                <td>
                  {u.roles.map((role) => (
                    <span key={role} className={`role-badge role-${role}`}>
                      {role}
                      {isAdmin && role !== "user" && (
                        <button
                          className="remove-role"
                          onClick={() => handleRoleRemove(u.id, role)}
                        >
                          ×
                        </button>
                      )}
                    </span>
                  ))}
                </td>
                {isAdmin && (
                  <td>
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleRoleAssign(u.id, e.target.value);
                          e.target.value = "";
                        }
                      }}
                    >
                      <option value="">Add role...</option>
                      <option value="admin">Admin</option>
                      <option value="user">User</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  </td>
                )}
              </tr>
            ))}
        </tbody>
      </table>

      {d.length > MAX_DISPLAY_USERS && (
        <p className="truncation-warning">
          Showing {MAX_DISPLAY_USERS} of {d.length} users
        </p>
      )}
    </div>
  );
}

import { useState, useEffect, FormEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { UserResponse } from "@user-management/shared";
import { usersApi, authApi, ApiError } from "../services/api";
import { useAuth } from "../hooks/useAuth";

function UserProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser, canAccessAdminFeatures } = useAuth();

  const [user, setUser] = useState<UserResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  // Determine if viewing own profile or another user
  const isOwnProfile = !id || id === currentUser?.id;
  const userId = isOwnProfile ? currentUser?.id : id;

  useEffect(() => {
    const loadUser = async () => {
      if (!userId) return;

      setIsLoading(true);
      setError(null);

      try {
        const userData = isOwnProfile
          ? await authApi.getCurrentUser()
          : await usersApi.getById(userId);

        setUser(userData);
        setFirstName(userData.firstName);
        setLastName(userData.lastName);
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.statusCode === 404) {
            setError("User not found");
          } else {
            setError(err.message);
          }
        } else {
          setError("Failed to load user profile");
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, [userId, isOwnProfile]);

  const canEdit = isOwnProfile || canAccessAdminFeatures();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!userId || !canEdit) return;

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const updatedUser = await usersApi.update(userId, {
        firstName,
        lastName,
      });
      setUser(updatedUser);
      setSuccess("Profile updated successfully");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to update profile");
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="loading">Loading profile...</div>;
  }

  if (error && !user) {
    return (
      <div className="card">
        <div className="error-message">{error}</div>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>
          Go Back
        </button>
      </div>
    );
  }

  if (!user) {
    return <div className="loading">User not found</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1>
          {isOwnProfile ? "My Profile" : `${user.firstName} ${user.lastName}`}
        </h1>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={user.email}
              disabled
              style={{ backgroundColor: "#f5f5f5" }}
            />
          </div>

          <div className="form-group">
            <label htmlFor="firstName">First Name</label>
            <input
              id="firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              disabled={!canEdit}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="lastName">Last Name</label>
            <input
              id="lastName"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              disabled={!canEdit}
              required
            />
          </div>

          <div className="form-group">
            <label>Roles</label>
            <div>
              {user.roles.map((role) => (
                <span
                  key={role}
                  className="badge badge-info"
                  style={{ marginRight: "4px" }}
                >
                  {role}
                </span>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Status</label>
            <div>
              <span
                className={`badge ${user.isActive ? "badge-success" : "badge-danger"}`}
              >
                {user.isActive ? "Active" : "Inactive"}
              </span>
            </div>
          </div>

          <div className="form-group">
            <label>Member Since</label>
            <div>{new Date(user.createdAt).toLocaleDateString()}</div>
          </div>

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          {canEdit && (
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSaving}
              style={{ marginTop: "16px" }}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

export default UserProfile;

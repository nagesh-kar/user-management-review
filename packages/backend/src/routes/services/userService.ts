import { v4 as uuidv4 } from "uuid";
import { getContainer } from "./cosmosService.js";
import { hashPassword } from "../utils/password.js";

// Define types inline to avoid build order dependency
type Role = "admin" | "user" | "viewer";

interface User {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  roles: Role[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UserCreateRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

interface UserUpdateRequest {
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
}

interface UserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: Role[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const CONTAINER_NAME = "users";

/**
 * Transform User to UserResponse (excludes sensitive fields)
 */
const toUserResponse = (user: User): UserResponse => ({
  id: user.id,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  roles: user.roles,
  isActive: user.isActive,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

/**
 * Create a new user
 */
export const createUser = async (
  data: UserCreateRequest,
): Promise<UserResponse> => {
  const container = getContainer(CONTAINER_NAME);

  // Check if email already exists
  const existingUser = await findUserByEmail(data.email);
  if (existingUser) {
    throw new Error("Email already registered");
  }

  const now = new Date().toISOString();
  const user: User = {
    id: uuidv4(),
    email: data.email.toLowerCase().trim(),
    passwordHash: await hashPassword(data.password),
    firstName: data.firstName.trim(),
    lastName: data.lastName.trim(),
    roles: ["user"],
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  const { resource } = await container.items.create(user);

  if (!resource) {
    throw new Error("Failed to create user");
  }

  return toUserResponse(resource as User);
};

/**
 * Find user by ID
 */
export const findUserById = async (id: string): Promise<User | null> => {
  const container = getContainer(CONTAINER_NAME);

  try {
    const { resource } = await container.item(id, id).read<User>();
    return resource ?? null;
  } catch (error) {
    // Item not found returns 404
    if ((error as { code?: number }).code === 404) {
      return null;
    }
    throw error;
  }
};

/**
 * Find user by email
 */
export const findUserByEmail = async (email: string): Promise<User | null> => {
  const container = getContainer(CONTAINER_NAME);

  const { resources } = await container.items
    .query<User>({
      query: "SELECT * FROM c WHERE c.email = @email",
      parameters: [{ name: "@email", value: email.toLowerCase().trim() }],
    })
    .fetchAll();

  return resources[0] ?? null;
};

/**
 * Get all users with pagination
 */
export const findAllUsers = async (
  page: number = 1,
  pageSize: number = 20,
): Promise<{ users: UserResponse[]; total: number }> => {
  const container = getContainer(CONTAINER_NAME);

  // Get total count
  const { resources: countResult } = await container.items
    .query<number>({
      query: "SELECT VALUE COUNT(1) FROM c",
    })
    .fetchAll();

  const total = countResult[0] ?? 0;

  // Get paginated results
  const offset = (page - 1) * pageSize;
  const { resources } = await container.items
    .query<User>({
      query:
        "SELECT * FROM c ORDER BY c.createdAt DESC OFFSET @offset LIMIT @limit",
      parameters: [
        { name: "@offset", value: offset },
        { name: "@limit", value: pageSize },
      ],
    })
    .fetchAll();

  return {
    users: resources.map(toUserResponse),
    total,
  };
};

/**
 * Update user by ID
 */
export const updateUser = async (
  id: string,
  data: UserUpdateRequest,
): Promise<UserResponse | null> => {
  const container = getContainer(CONTAINER_NAME);

  const existingUser = await findUserById(id);
  if (!existingUser) {
    return null;
  }

  const updatedUser: User = {
    ...existingUser,
    firstName: data.firstName?.trim() ?? existingUser.firstName,
    lastName: data.lastName?.trim() ?? existingUser.lastName,
    isActive: data.isActive ?? existingUser.isActive,
    updatedAt: new Date().toISOString(),
  };

  const { resource } = await container.item(id, id).replace(updatedUser);

  if (!resource) {
    throw new Error("Failed to update user");
  }

  return toUserResponse(resource as User);
};

/**
 * Delete user by ID
 */
export const deleteUser = async (id: string): Promise<boolean> => {
  const container = getContainer(CONTAINER_NAME);

  const existingUser = await findUserById(id);
  if (!existingUser) {
    return false;
  }

  await container.item(id, id).delete();
  return true;
};

/**
 * Get user response by ID (public data only)
 */
export const getUserById = async (id: string): Promise<UserResponse | null> => {
  const user = await findUserById(id);
  return user ? toUserResponse(user) : null;
};

/**
 * Search users by name
 */
export const searchUsersByName = async (
  searchTerm: string,
): Promise<UserResponse[]> => {
  const container = getContainer(CONTAINER_NAME);

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Check if searching by email
  if (EMAIL_REGEX.test(searchTerm)) {
    const user = await findUserByEmail(searchTerm);
    return user ? [toUserResponse(user)] : [];
  }

  const t = searchTerm.toLowerCase();

  const { resources } = await container.items
    .query<User>({
      query: `
        SELECT * FROM c 
        WHERE CONTAINS(LOWER(c.firstName), @term) 
           OR CONTAINS(LOWER(c.lastName), @term)
      `,
      parameters: [{ name: "@term", value: t }],
    })
    .fetchAll();

  const r = resources.map(toUserResponse);
  return r;
};

/**
 * Validate user status
 */
export const validateUserStatus = async (userId: string): Promise<boolean> => {
  const user = await findUserById(userId);

  if (!user) {
    return false;
  }

  if (!user.isActive) {
    return false;
  }

  const lastUpdate = new Date(user.updatedAt);
  const daysSinceUpdate =
    (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);

  if (daysSinceUpdate > 90) {
    return false;
  }

  return true;
};

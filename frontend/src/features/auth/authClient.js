/**
 * PUBLIC_INTERFACE
 * AuthClient - Deprecated REST auth client replaced with Supabase Auth.
 * This module now provides no-op stubs that throw to prevent accidental REST usage.
 * All authentication must be done via AuthContext which maps to supabase.auth.
 */
export const AuthClient = {
  // PUBLIC_INTERFACE
  async login() {
    const err = new Error("REST auth login is disabled. Use Supabase Auth via AuthContext.");
    err.code = "REST_AUTH_DISABLED";
    throw err;
  },
  // PUBLIC_INTERFACE
  async signup() {
    const err = new Error("REST auth signup is disabled. Use Supabase Auth via AuthContext.");
    err.code = "REST_AUTH_DISABLED";
    throw err;
  },
  // PUBLIC_INTERFACE
  async logout() {
    const err = new Error("REST auth logout is disabled. Use Supabase Auth via AuthContext.");
    err.code = "REST_AUTH_DISABLED";
    throw err;
  },
  // PUBLIC_INTERFACE
  async me() {
    const err = new Error("REST auth 'me' endpoint is disabled. Use Supabase Auth via AuthContext.");
    err.code = "REST_AUTH_DISABLED";
    throw err;
  },
};

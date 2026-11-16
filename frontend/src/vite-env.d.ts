/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  /** Public Cloudinary cloud name used to build delivery URLs. */
  readonly VITE_CLOUDINARY_CLOUD_NAME?: string
  /**
   * Public Google OAuth client ID for Google Identity Services. Empty keeps
   * Google sign-in hidden. Never place a client secret in a VITE_ variable.
   */
  readonly VITE_GOOGLE_CLIENT_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

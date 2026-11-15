/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  /** Public Cloudinary cloud name used to build delivery URLs. */
  readonly VITE_CLOUDINARY_CLOUD_NAME?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

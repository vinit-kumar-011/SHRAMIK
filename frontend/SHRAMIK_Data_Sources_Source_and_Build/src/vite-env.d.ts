/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DATA_SOURCES_API_BASE_URL?: string;
  readonly VITE_DATA_SOURCES_ENABLE_CREATE?: string;
  readonly VITE_DATA_SOURCES_ENABLE_INGESTION?: string;
}
interface ImportMeta { readonly env: ImportMetaEnv }

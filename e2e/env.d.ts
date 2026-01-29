declare namespace NodeJS {
  interface ProcessEnv {
    /** Base URL for E2E tests (default: http://localhost:3000) */
    E2E_BASE_URL?: string;
    /** Test user email for authentication */
    E2E_USER_EMAIL?: string;
    /** Test user password for authentication */
    E2E_USER_PASSWORD?: string;
    /** CI environment flag */
    CI?: string;
  }
}

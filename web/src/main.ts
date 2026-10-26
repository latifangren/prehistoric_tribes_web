import "./styles.css";
import { initializeStorage, webStorageAdapter } from "./platform/Storage";

async function startApplication(): Promise<void> {
  await initializeStorage(webStorageAdapter);
  // Runtime modules read cached preferences during import, so load them only after storage initialization.
  await import("./mainRuntime");
}

void startApplication().catch((error: unknown) => {
  console.error("Application startup failed", error);
});

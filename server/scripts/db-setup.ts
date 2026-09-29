/** CLI wrapper: `pnpm db:setup` locally, `node dist/db-setup.js` as Railway's pre-deploy command. */
import "dotenv/config";
import { runDatabaseSetup } from "../db-setup";

runDatabaseSetup().then(
  () => process.exit(0),
  (error) => {
    console.error("[db-setup] failed:", error);
    process.exit(1);
  },
);

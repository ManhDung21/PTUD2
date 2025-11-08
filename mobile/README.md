# Mobile App

The Expo mobile client reuses the same backend APIs as the web app
(`/auth/*`, `/api/descriptions/*`, `/api/history`, …). To keep the app
portable, the API base URL is resolved in this order:

1. `extra.apiBaseUrl` defined in `mobile/app.config.ts`
2. Environment variables (`EXPO_PUBLIC_API_BASE_URL` or `NEXT_PUBLIC_API_BASE_URL`)
3. The LAN IP address Expo is serving from (only when using Expo Go in development)
4. `http://localhost:8000` as a last resort

## Configuring the backend URL

1. Create a `.env` file (either in the project root or inside `mobile/`)
   and set the desired host:

   ```bash
   EXPO_PUBLIC_API_BASE_URL=https://your-backend.example.com
   ```

2. Start Expo from the `mobile` folder:

   ```bash
   cd mobile
   npx expo start --clear
   ```

When the backend runs on the same machine (e.g., `uvicorn --host 0.0.0.0 --port 8000`),
the app will automatically derive `http://<LAN-IP>:8000` from the Expo host URI, so
you can usually test on a physical device without touching the config.

## Notes

- Android HTTP connections require clear-text traffic to be enabled. The new
  `app.config.ts` toggles this automatically when the base URL uses `http://`.
- You can always confirm the chosen endpoint by inspecting the Metro logs;
  in development the app prints `[mobile] API base URL: ...` once during startup.

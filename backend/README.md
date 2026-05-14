# LumaLex Backend

This backend now does three things for the website:

1. AI-powered vocabulary enrichment through `POST /api/enrich`
2. MySQL-backed custom word storage through `GET/POST /api/items`
3. Serves the frontend itself so the app can be opened over local Wi-Fi from a browser

## 1. Install dependencies

```powershell
cd D:\codex\world_app\backend
python -m pip install -r requirements.txt
```

## 2. Configure environment

Copy `.env.example` to `.env` and update:

- `DATABASE_URL`
- `COMPAT_API_KEY`
- `COMPAT_BASE_URL`
- `COMPAT_MODEL`
- `APP_HOST`
- `APP_PORT`
- `PUBLIC_BASE_URL` (optional, reserved for a future public deployment)

Example MySQL connection:

```env
DATABASE_URL=mysql+pymysql://root:password@127.0.0.1:3306/lumalex?charset=utf8mb4
```

## 3. Run the backend

```powershell
cd D:\codex\world_app\backend
python app.py
```

Default local browser entry:

```text
http://127.0.0.1:8000
```

The backend also exposes the API from the same origin:

```text
http://127.0.0.1:8000/api
```

## 4. Open on phone over the same Wi-Fi

1. Keep the backend running on the computer.
2. Make sure both the computer and phone are on the same Wi-Fi / campus network.
3. Open `http://127.0.0.1:8000` on the computer.
4. The homepage will show a local access hint such as `http://192.168.x.x:8000`.
5. Open that same address in the phone browser.

For Qwen via DashScope OpenAI-compatible mode:

```env
COMPAT_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
COMPAT_MODEL=qwen3-max
```

## Notes

- The frontend is still usable if the backend is offline; it falls back to local browser storage.
- For LAN access, `APP_HOST=0.0.0.0` is recommended.
- If no compatible API key is configured, the enrich endpoint falls back to dictionary + template generation.
- Custom words saved through the backend are stored per browser-side `user key` until a real login system is added.
- `PUBLIC_BASE_URL` is reserved for Version 2 if you later move the app to a public domain.

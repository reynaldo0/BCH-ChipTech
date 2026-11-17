# KOMPAS production deployment

Deployment layout:

- Frontend: Vercel at `https://kompasdev.my.id`
- API: VPS at `https://api.kompasdev.my.id`
- FastAPI container: port `8005`
- Caddy: TLS termination and reverse proxy on ports `80`/`443`
- Persistent SQLite database: Docker volume `kompas_backend_data`
- Persistent import uploads: Docker volume `kompas_uploads`

## 1. DNS

Create these DNS records:

```text
kompasdev.my.id       CNAME  <your-vercel-domain>
www.kompasdev.my.id   CNAME  <your-vercel-domain>
api.kompasdev.my.id   A      <VPS_PUBLIC_IP>
```

Point the Vercel domain from the Vercel dashboard. Caddy obtains the API certificate
automatically after `api.kompasdev.my.id` resolves to the VPS.

## 2. VPS prerequisites

Install Docker Engine and the Compose plugin, then open the firewall:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

Port `8005` is published for direct health checks, but public API traffic should use
the HTTPS domain through Caddy. Restrict port `8005` to trusted IPs in the VPS
firewall if direct access is not needed.

## 3. Deploy the API

From the repository root on the VPS:

```bash
cp deploy/backend.env.example deploy/backend.env
chmod 600 deploy/backend.env
```

Edit `deploy/backend.env` and set at least:

- a unique `SESSION_SECRET` (64+ random characters);
- a strong `SEED_USER_PASSWORD`;
- the production `ALLOWED_ORIGINS`.

Then start the stack:

```bash
docker compose build --pull
docker compose up -d
docker compose ps
curl -f http://127.0.0.1:8005/healthz
curl -f https://api.kompasdev.my.id/healthz
```

On first startup the application creates all tables and seeds the catalog, rules,
FAQ, evaluation data, transactions, and initial users. With `DEMO_MODE=false`,
the five initial users use `SEED_USER_PASSWORD` as their password:

```text
owner, manager, cs, packing, judge
```

The owner can then approve account requests and manage user roles from the
Settings page.

Useful operations:

```bash
docker compose logs -f backend
docker compose restart backend
docker compose pull caddy
docker compose up -d caddy
docker compose down
```

Do not run `docker compose down -v` unless the database and uploaded files are
intentionally being deleted.

## 4. Configure Vercel

In the Vercel project settings, add these Production environment variables:

```text
NEXT_PUBLIC_API_URL=https://api.kompasdev.my.id
NEXT_PUBLIC_DEMO_MODE=false
```

Redeploy after saving the variables. Preview deployments can use the same API only
after their Vercel origin is added to `ALLOWED_ORIGINS`.

## 5. Smoke test

```bash
curl -i https://api.kompasdev.my.id/healthz
curl -i https://api.kompasdev.my.id/
```

Open `https://kompasdev.my.id/masuk`, log in with the seeded owner account, and
confirm that the dashboard loads data from the VPS API. Never place
`SESSION_SECRET`, `SEED_USER_PASSWORD`, or an AI API key in Vercel variables.

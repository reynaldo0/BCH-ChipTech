# KOMPAS production deployment

Deployment layout:

- Frontend: Vercel at `https://kompasdev.my.id`
- API: VPS at `https://api.kompasdev.my.id`
- FastAPI container: port `8005`
- Nginx on the VPS: TLS termination and reverse proxy on ports `80`/`443`
- Persistent MySQL database: Docker volume `kompas_mysql_data`
- Persistent import uploads: Docker volume `kompas_uploads`

## 1. DNS

Create these DNS records:

```text
kompasdev.my.id       CNAME  <your-vercel-domain>
www.kompasdev.my.id   CNAME  <your-vercel-domain>
api.kompasdev.my.id   A      <VPS_PUBLIC_IP>
```

Point the Vercel domain from the Vercel dashboard. Nginx and Certbot will provide the
API HTTPS certificate after `api.kompasdev.my.id` resolves to the VPS.

## 2. VPS prerequisites

Install Docker Engine and the Compose plugin, then open the firewall:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

The backend is bound to `127.0.0.1:8005`; public API traffic must use the HTTPS domain
through Nginx.

## 3. Deploy the API

From the repository root on the VPS:

```bash
cat > .env <<EOF
MYSQL_PASSWORD=$(openssl rand -hex 32)
MYSQL_ROOT_PASSWORD=$(openssl rand -hex 32)
EOF
chmod 600 .env
cp backend/.env.example backend/.env
chmod 600 backend/.env
```

Edit `.env` and `backend/.env` and set at least:

- a unique `SESSION_SECRET` (64+ random characters);
- a strong `SEED_USER_PASSWORD`;
- the production `ALLOWED_ORIGINS`;
- a strong `MYSQL_PASSWORD` and a different `MYSQL_ROOT_PASSWORD` in `.env`.
  Compose injects `MYSQL_PASSWORD` into both MySQL and the backend connection
  string.

Then start the stack:

```bash
docker compose build --pull
docker compose up -d
docker compose ps
curl -f http://127.0.0.1:8005/healthz
```

On first startup MySQL initializes inside the `db` container. The application
then creates all tables and seeds the catalog, rules, FAQ, evaluation data,
transactions, and initial users. With `DEMO_MODE=false`,
the five initial users use `SEED_USER_PASSWORD` as their password:

```text
owner, manager, cs, packing, judge
```

The owner can then approve account requests and manage user roles from the
Settings page.

### Sinkronkan password akun seeded

Dalam production, seeder akan memperbarui password kelima akun seeded agar sama
dengan `SEED_USER_PASSWORD` setiap backend restart. Pastikan nilai tersebut sudah
benar di `backend/.env`, lalu rebuild dan restart:

```bash
docker compose up -d --build backend
docker compose restart backend
docker compose logs backend --tail=30
```

Periksa environment yang diterima container tanpa menampilkan password:

```bash
docker compose exec backend python -c "from backend.app.config import settings; print('DEMO_MODE=', settings.demo_mode); print('DATABASE=', settings.database_url.split('@')[-1] if '@' in settings.database_url else 'configured') ; print('SEED_PASSWORD_SET=', bool(settings.seed_user_password))"
```

Useful operations:

```bash
docker compose logs -f backend
docker compose restart backend
docker compose down
```

Do not run `docker compose down -v` unless the MySQL database and uploaded
files are intentionally being deleted.

## 4. Configure Nginx and HTTPS

Install Nginx and Certbot:

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

Create the Nginx virtual host:

```bash
sudo tee /etc/nginx/sites-available/kompas-api >/dev/null <<'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name api.kompasdev.my.id;

    location / {
        proxy_pass http://127.0.0.1:8005;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }
}
EOF

sudo ln -sfn /etc/nginx/sites-available/kompas-api /etc/nginx/sites-enabled/kompas-api
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d api.kompasdev.my.id
```

Test:

```bash
curl -f https://api.kompasdev.my.id/healthz
```

### Jika port 80 atau 443 sudah dipakai

Nginx harus memakai port `80` dan `443` untuk HTTP redirect serta sertifikat HTTPS.
Cari proses yang sedang memakai port tersebut terlebih dahulu:

```bash
sudo ss -ltnp | grep -E ':(80|443)\b'
docker ps --format 'table {{.ID}}\t{{.Names}}\t{{.Ports}}'
```

Jika Nginx sudah berjalan, jangan dihentikan. Tambahkan virtual host `kompas-api`
seperti di atas. Jika Apache yang memakai port dan tidak diperlukan, hentikan:

```bash
sudo systemctl stop apache2
sudo systemctl disable apache2
sudo systemctl reload nginx
```

Jika pemakainya container lama, hentikan hanya container yang ditampilkan oleh `docker ps`
dan memang tidak diperlukan:

```bash
docker stop <CONTAINER_ID>
docker compose up -d
```

Jangan memindahkan port Nginx ke port lain untuk production sebelum DNS atau reverse proxy
di depannya dikonfigurasi ulang. Setelah Nginx aktif, periksa juga `443` karena biasanya
port tersebut ikut bentrok.

## 5. Configure Vercel

In the Vercel project settings, add these Production environment variables:

```text
NEXT_PUBLIC_API_URL=https://api.kompasdev.my.id
NEXT_PUBLIC_DEMO_MODE=false
```

Redeploy after saving the variables. Preview deployments can use the same API only
after their Vercel origin is added to `ALLOWED_ORIGINS`.

## 6. Smoke test

```bash
curl -i https://api.kompasdev.my.id/healthz
curl -i https://api.kompasdev.my.id/
```

Open `https://kompasdev.my.id/masuk`, log in with the seeded owner account, and
confirm that the dashboard loads data from the VPS API. Never place
`SESSION_SECRET`, `SEED_USER_PASSWORD`, or an AI API key in Vercel variables.

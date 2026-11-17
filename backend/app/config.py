from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    app_name: str = "KOMPAS API"
    env: str = "development"
    demo_mode: bool = True

    database_url: str = f"sqlite:///{(ROOT / 'backend' / 'kompas.db').as_posix()}"
    session_secret: str = "kompas-demo-secret-change-me-please-32b"
    session_ttl_hours: int = 8
    # Initial password for the five seeded accounts when DEMO_MODE=false (required then).
    seed_user_password: str = ""
    login_max_failures: int = 5
    login_window_s: int = 300

    # AI provider: Jev (TypeSafe) via OpenRouter. OFF by default (proposal §4.2).
    # Put the key in backend/.env as OPENROUTER_API_KEY=sk-or-v1-...
    jev_enabled: bool = False
    openrouter_api_key: str = ""
    jev_api_key: str = ""  # legacy name, still accepted
    jev_endpoint: str = "https://openrouter.ai/api/alpha/decisions"
    jev_model: str = "typesafe/jev-1.14"
    jev_timeout_ms: int = 2000
    jev_retries: int = 1
    jev_breaker_failures: int = 3
    jev_breaker_cooldown_s: int = 600
    # Calibrated on 100 real Jev calls (Golden Set 100): at 0.8 only 1/76 ordinary
    # questions was escalated while Jev still caught 19/24 non-general messages.
    jev_raise_threshold: float = 0.8
    jev_max_calls_per_minute: int = 120
    jev_cache_ttl_s: int = 600
    jev_queue_workers: int = 6

    # Data freshness and calculation defaults (locked in DECISIONS.md)
    stock_freshness_hours: int = 24
    formula_version: str = "profit-v1"
    margin_base: str = "NET_REVENUE"
    rounding_mode: str = "ROUND_HALF_UP"

    # Import limits
    import_max_file_mb: int = 10
    import_max_rows: int = 10000
    import_max_columns: int = 30

    allowed_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    data_dir: Path = ROOT / "data"
    csv_dir: Path = ROOT / "csv"

    model_config = SettingsConfigDict(
        env_file=ROOT / "backend" / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def allowed_origin_list(self) -> list[str]:
        return [x.strip() for x in self.allowed_origins.split(",") if x.strip()]

    @property
    def openrouter_key(self) -> str:
        return (self.openrouter_api_key or self.jev_api_key).strip()

    @property
    def jev_ready(self) -> bool:
        return bool(self.jev_enabled and self.openrouter_key)


DEFAULT_SECRETS = {
    "kompas-demo-secret-change-me",
    "kompas-demo-secret-change-me-please-32b",
    "replace-this-with-a-long-random-secret",
    "replace-this-with-a-long-random-secret-of-32-plus-chars",
}


def production_problems(cfg: "Settings") -> list[str]:
    """Reasons this configuration is unsafe for DEMO_MODE=false."""
    problems: list[str] = []
    if cfg.session_secret in DEFAULT_SECRETS or len(cfg.session_secret) < 32:
        problems.append("SESSION_SECRET harus unik dan minimal 32 karakter (bukan nilai contoh).")
    if len(cfg.seed_user_password) < 10:
        problems.append("SEED_USER_PASSWORD wajib diisi (minimal 10 karakter) untuk akun awal.")
    if "*" in cfg.allowed_origins:
        problems.append("ALLOWED_ORIGINS tidak boleh berisi * di produksi.")
    return problems


settings = Settings()

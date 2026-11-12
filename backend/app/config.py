from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    app_name: str = "KOMPAS API"
    env: str = "development"
    demo_mode: bool = True

    database_url: str = f"sqlite:///{(ROOT / 'backend' / 'kompas.db').as_posix()}"
    session_secret: str = "kompas-demo-secret-change-me"
    session_ttl_hours: int = 8

    # AI provider (Jev / TypeSafe). Disabled unless a key is configured.
    jev_enabled: bool = False
    jev_api_key: str = ""
    jev_api_base_url: str = "https://api.typesafe.ai"
    jev_model: str = "jev-1.13.0"
    jev_timeout_ms: int = 8000

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
    def jev_ready(self) -> bool:
        return bool(self.jev_enabled and self.jev_api_key.strip())


settings = Settings()

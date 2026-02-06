"""
Configuration settings for Tira Automation
Updated to use Playwright Chromium with cookie-based authentication (no Chrome profiles)
"""

from pydantic_settings import BaseSettings
from pathlib import Path
from typing import Optional


class Settings(BaseSettings):
    """Application settings"""
    
    # API Configuration
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8005
    
    # Paths
    BASE_DIR: Path = Path(__file__).parent.parent
    DATA_DIR: Path = BASE_DIR / "data"
    LOGS_DIR: Path = BASE_DIR / "logs"
    ORDERS_DIR: Path = DATA_DIR / "orders"
    
    # Data files
    PRODUCTS_FILE: Path = DATA_DIR / "products.json"
    ADDRESSES_FILE: Path = DATA_DIR / "addresses.json"
    ORDERS_HISTORY_FILE: Path = ORDERS_DIR / "orders_history.json"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://tira_admin:tira@localhost:5432/tira_automation"

    
    # Session Management (replaces Chrome profiles)
    TOTAL_SESSIONS: int = 20  # Number of concurrent sessions to support
    SESSION_TIMEOUT: int = 1800000  # 30 minutes in milliseconds
    
    # Automation Settings
    MAX_CONCURRENT_BROWSERS: int = 5
    DEFAULT_DELAY_MIN: float = 2.0
    DEFAULT_DELAY_MAX: float = 5.0
    HEADLESS_MODE: bool = False
    BROWSER_TIMEOUT: int = 60000  # milliseconds
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    LOG_DATE_FORMAT: str = "%Y-%m-%d %H:%M:%S"
    
    # Tira Website
    TIRA_BASE_URL: str = "https://www.tirabeauty.com"
    TIRA_CART_URL: str = f"{TIRA_BASE_URL}/cart"
    TIRA_CHECKOUT_URL: str = f"{TIRA_BASE_URL}/checkout"
    TIRA_ADDRESS_URL: str = f"{TIRA_BASE_URL}/profile/address"
    
    # Delays (in seconds)
    DELAY_AFTER_PAGE_LOAD: float = 4.0
    DELAY_AFTER_CLICK: float = 1.0
    DELAY_AFTER_INPUT: float = 0.5
    DELAY_BETWEEN_PRODUCTS: float = 1.5
    DELAY_BEFORE_CHECKOUT: float = 3.0
    
    # Retry Configuration
    MAX_RETRIES: int = 3
    RETRY_DELAY: float = 5.0
    
    # Browser Configuration
    VIEWPORT_WIDTH: int = 1280
    VIEWPORT_HEIGHT: int = 720
    USER_AGENT: str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    
    # Auth Settings
    SECRET_KEY: str = "your-super-secret-key-change-it-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440 # 24 hours
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Global settings instance
settings = Settings()
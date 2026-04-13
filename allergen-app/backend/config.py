import os
import secrets


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY") or secrets.token_urlsafe(32)
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL", "sqlite:///allergens.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@restaurant.com")
    ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "")
    ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
    RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
    ADMIN_NOTIFICATION_EMAIL = os.environ.get("ADMIN_NOTIFICATION_EMAIL", os.environ.get("ADMIN_EMAIL", "admin@restaurant.com"))
    RESTAURANT_NAME = "Curious Kitchen — Thorpe Park Hotel & Spa"
    RESTAURANT_ADDRESS = "Thorpe Park Hotel & Spa, 1150 Century Way, Leeds LS15 8ZB"
    RESTAURANT_PHONE = "0113 264 1000"
    VAT_NUMBER = os.environ.get("VAT_NUMBER", "GB 123 4567 89")
    SERVICE_CHARGE_RATE = float(os.environ.get("SERVICE_CHARGE_RATE", "0.10"))  # 10%
    FROM_EMAIL = os.environ.get("FROM_EMAIL", "orders@hospohub.co.uk")
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    PERMANENT_SESSION_LIFETIME = 3600  # 1 hour

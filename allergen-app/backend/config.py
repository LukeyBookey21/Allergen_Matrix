import os
import secrets


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY") or secrets.token_urlsafe(32)
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL", "sqlite:///allergens.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@restaurant.com")
    ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "changeme123")
    ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
    SENDGRID_API_KEY = os.environ.get("SENDGRID_API_KEY", "")
    ADMIN_NOTIFICATION_EMAIL = os.environ.get("ADMIN_NOTIFICATION_EMAIL", os.environ.get("ADMIN_EMAIL", "admin@restaurant.com"))
    RESTAURANT_NAME = "Curious Kitchen — Thorpe Park Hotel & Spa"
    FROM_EMAIL = os.environ.get("FROM_EMAIL", "noreply@curiouskitchen.com")

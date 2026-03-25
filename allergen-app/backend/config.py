import os


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "change-me-in-production")
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL", "sqlite:///allergens.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@restaurant.com")
    ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "changeme123")
    ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")

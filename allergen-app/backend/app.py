import logging
import os
import sys

from flask import Flask, send_from_directory
from flask_cors import CORS
from flask_login import LoginManager
from werkzeug.security import generate_password_hash

logger = logging.getLogger(__name__)

from config import Config
from models import db, AdminUser, seed_allergens, seed_menus
from seed_data import seed_dishes
from routes.admin import admin_bp
from routes.public import public_bp

def create_app():
    app = Flask(__name__, static_folder=None)
    app.config.from_object(Config)

    # CORS
    CORS(app, supports_credentials=True)

    # Database
    db.init_app(app)

    # Login manager
    login_manager = LoginManager()
    login_manager.init_app(app)

    @login_manager.user_loader
    def load_user(user_id):
        return AdminUser.query.get(int(user_id))

    @login_manager.unauthorized_handler
    def unauthorized():
        from flask import jsonify
        return jsonify({"error": "Authentication required"}), 401

    # Register blueprints
    app.register_blueprint(admin_bp)
    app.register_blueprint(public_bp)

    # Serve React frontend in production
    frontend_build = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
    if os.path.isdir(frontend_build):
        @app.route("/", defaults={"path": ""})
        @app.route("/<path:path>")
        def serve_frontend(path):
            full_path = os.path.join(frontend_build, path)
            if path and os.path.isfile(full_path):
                return send_from_directory(frontend_build, path)
            return send_from_directory(frontend_build, "index.html")

    with app.app_context():
        db.create_all()

        try:
            seed_allergens()
            seed_menus()
            seed_dishes()
        except Exception as e:
            logger.error("Seed data failed: %s", e)
            db.session.rollback()

        # Create admin user if not exists
        admin_email = app.config["ADMIN_EMAIL"]
        admin_password = app.config["ADMIN_PASSWORD"]
        if admin_password and not AdminUser.query.filter_by(email=admin_email).first():
            admin = AdminUser(
                email=admin_email,
                password=generate_password_hash(admin_password),
                role="chef",
            )
            db.session.add(admin)
            db.session.commit()

        # Create FOH user if not exists
        foh_email = os.environ.get("FOH_EMAIL", "foh@restaurant.com")
        foh_password = os.environ.get("FOH_PASSWORD", "")
        if foh_password and not AdminUser.query.filter_by(email=foh_email).first():
            foh = AdminUser(
                email=foh_email,
                password=generate_password_hash(foh_password),
                role="foh",
            )
            db.session.add(foh)
            db.session.commit()

    return app


if __name__ == "__main__":
    app = create_app()
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=os.environ.get("FLASK_DEBUG", "").lower() == "true")

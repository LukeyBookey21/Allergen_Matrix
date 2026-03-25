from flask import Blueprint, request, jsonify, current_app
from flask_login import login_user, logout_user, login_required, current_user
from werkzeug.security import check_password_hash
import io
import qrcode
from flask import send_file

from models import db, AdminUser, MenuItem, Ingredient, Allergen, MenuItemAllergen
from parser import parse_and_detect

admin_bp = Blueprint("admin", __name__, url_prefix="/admin")


@admin_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    email = data.get("email", "")
    password = data.get("password", "")

    user = AdminUser.query.filter_by(email=email).first()
    if user and check_password_hash(user.password, password):
        login_user(user)
        return jsonify({"message": "Logged in", "email": user.email})
    return jsonify({"error": "Invalid credentials"}), 401


@admin_bp.route("/logout", methods=["GET", "POST"])
@login_required
def logout():
    logout_user()
    return jsonify({"message": "Logged out"})


@admin_bp.route("/me", methods=["GET"])
@login_required
def me():
    return jsonify({"email": current_user.email})


@admin_bp.route("/dishes", methods=["GET"])
@login_required
def list_dishes():
    dishes = MenuItem.query.order_by(MenuItem.id.desc()).all()
    result = []
    for dish in dishes:
        allergens = []
        for ma in dish.allergens:
            allergens.append({
                "id": ma.allergen.id,
                "name": ma.allergen.name,
                "icon_emoji": ma.allergen.icon_emoji,
                "auto_detected": ma.auto_detected,
                "manually_overridden": ma.manually_overridden,
            })
        result.append({
            "id": dish.id,
            "name": dish.name,
            "description": dish.description,
            "price": dish.price,
            "active": dish.active,
            "ingredients": [{"id": i.id, "raw_text": i.raw_text, "parsed_name": i.parsed_name} for i in dish.ingredients],
            "allergens": allergens,
        })
    return jsonify(result)


@admin_bp.route("/dishes", methods=["POST"])
@login_required
def add_dish():
    data = request.get_json()
    name = data.get("name", "").strip()
    description = data.get("description", "").strip()
    price = data.get("price", 0)
    ingredients_text = data.get("ingredients", "")
    allergen_names = data.get("allergen_names")

    if not name:
        return jsonify({"error": "Name is required"}), 400

    dish = MenuItem(name=name, description=description, price=float(price), active=True)
    db.session.add(dish)
    db.session.flush()

    # Add ingredients
    for line in ingredients_text.strip().split("\n"):
        line = line.strip()
        if line:
            ing = Ingredient(menu_item_id=dish.id, raw_text=line, parsed_name=line)
            db.session.add(ing)

    # Detect or use provided allergens
    if allergen_names is None:
        api_key = current_app.config.get("ANTHROPIC_API_KEY", "")
        detection = parse_and_detect(ingredients_text, api_key)
        allergen_names = detection["allergens"]

    for aname in allergen_names:
        allergen = Allergen.query.filter_by(name=aname).first()
        if allergen:
            ma = MenuItemAllergen(
                menu_item_id=dish.id,
                allergen_id=allergen.id,
                auto_detected=True,
                manually_overridden=False,
            )
            db.session.add(ma)

    db.session.commit()
    return jsonify({"id": dish.id, "message": "Dish created"}), 201


@admin_bp.route("/dishes/<int:dish_id>", methods=["PUT"])
@login_required
def edit_dish(dish_id):
    dish = MenuItem.query.get_or_404(dish_id)
    data = request.get_json()

    dish.name = data.get("name", dish.name).strip()
    dish.description = data.get("description", dish.description).strip()
    dish.price = float(data.get("price", dish.price))

    ingredients_text = data.get("ingredients")
    if ingredients_text is not None:
        # Replace ingredients
        Ingredient.query.filter_by(menu_item_id=dish.id).delete()
        for line in ingredients_text.strip().split("\n"):
            line = line.strip()
            if line:
                ing = Ingredient(menu_item_id=dish.id, raw_text=line, parsed_name=line)
                db.session.add(ing)

    allergen_names = data.get("allergen_names")
    if allergen_names is not None:
        MenuItemAllergen.query.filter_by(menu_item_id=dish.id).delete()
        for aname in allergen_names:
            allergen = Allergen.query.filter_by(name=aname).first()
            if allergen:
                ma = MenuItemAllergen(
                    menu_item_id=dish.id,
                    allergen_id=allergen.id,
                    auto_detected=False,
                    manually_overridden=True,
                )
                db.session.add(ma)
    elif ingredients_text is not None:
        # Re-detect allergens
        MenuItemAllergen.query.filter_by(menu_item_id=dish.id).delete()
        api_key = current_app.config.get("ANTHROPIC_API_KEY", "")
        detection = parse_and_detect(ingredients_text, api_key)
        for aname in detection["allergens"]:
            allergen = Allergen.query.filter_by(name=aname).first()
            if allergen:
                ma = MenuItemAllergen(
                    menu_item_id=dish.id,
                    allergen_id=allergen.id,
                    auto_detected=True,
                    manually_overridden=False,
                )
                db.session.add(ma)

    db.session.commit()
    return jsonify({"message": "Dish updated"})


@admin_bp.route("/dishes/<int:dish_id>", methods=["DELETE"])
@login_required
def delete_dish(dish_id):
    dish = MenuItem.query.get_or_404(dish_id)
    db.session.delete(dish)
    db.session.commit()
    return jsonify({"message": "Dish deleted"})


@admin_bp.route("/dishes/<int:dish_id>/toggle", methods=["PATCH"])
@login_required
def toggle_dish(dish_id):
    dish = MenuItem.query.get_or_404(dish_id)
    dish.active = not dish.active
    db.session.commit()
    return jsonify({"active": dish.active})


@admin_bp.route("/dishes/<int:dish_id>/override-allergens", methods=["POST"])
@login_required
def override_allergens(dish_id):
    dish = MenuItem.query.get_or_404(dish_id)
    data = request.get_json()
    allergen_names = data.get("allergen_names", [])

    MenuItemAllergen.query.filter_by(menu_item_id=dish.id).delete()
    for aname in allergen_names:
        allergen = Allergen.query.filter_by(name=aname).first()
        if allergen:
            ma = MenuItemAllergen(
                menu_item_id=dish.id,
                allergen_id=allergen.id,
                auto_detected=False,
                manually_overridden=True,
            )
            db.session.add(ma)

    db.session.commit()
    return jsonify({"message": "Allergens overridden"})


@admin_bp.route("/detect-allergens", methods=["POST"])
@login_required
def detect_allergens():
    data = request.get_json()
    ingredients_text = data.get("ingredients", "")
    api_key = current_app.config.get("ANTHROPIC_API_KEY", "")
    result = parse_and_detect(ingredients_text, api_key)
    return jsonify(result)


@admin_bp.route("/qr-code", methods=["GET"])
@login_required
def generate_qr():
    base_url = request.host_url.rstrip("/")
    menu_url = f"{base_url}/menu"

    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(menu_url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)

    return send_file(buf, mimetype="image/png", download_name="menu-qr-code.png")

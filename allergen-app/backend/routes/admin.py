import re

from flask import Blueprint, request, jsonify, current_app
from flask_login import login_user, logout_user, login_required, current_user
from werkzeug.security import check_password_hash
import io
import qrcode
from flask import send_file

from models import db, AdminUser, Menu, MenuItem, Ingredient, Allergen, MenuItemAllergen, Order, OrderItem, Pairing
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


# ── Menu CRUD ──────────────────────────────────────────

@admin_bp.route("/menus", methods=["GET"])
@login_required
def list_menus():
    menus = Menu.query.order_by(Menu.display_order).all()
    return jsonify([
        {
            "id": m.id,
            "name": m.name,
            "slug": m.slug,
            "description": m.description,
            "icon": m.icon,
            "display_order": m.display_order,
            "active": m.active,
        }
        for m in menus
    ])


@admin_bp.route("/menus", methods=["POST"])
@login_required
def create_menu():
    data = request.get_json()
    name = data.get("name", "").strip()
    slug = data.get("slug", "").strip()
    if not name or not slug:
        return jsonify({"error": "Name and slug are required"}), 400
    if len(name) > 200:
        return jsonify({"error": "Name must be 1-200 characters"}), 400
    if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', slug):
        return jsonify({"error": "Slug must contain only lowercase letters, numbers, and hyphens"}), 400
    if Menu.query.filter_by(slug=slug).first():
        return jsonify({"error": "Slug already exists"}), 400
    menu = Menu(
        name=name,
        slug=slug,
        description=data.get("description", ""),
        icon=data.get("icon", ""),
        display_order=data.get("display_order", 0),
        active=data.get("active", True),
    )
    db.session.add(menu)
    db.session.commit()
    return jsonify({"id": menu.id, "message": "Menu created"}), 201


@admin_bp.route("/menus/<int:menu_id>", methods=["PUT"])
@login_required
def update_menu(menu_id):
    menu = Menu.query.get_or_404(menu_id)
    data = request.get_json()
    updated_name = data.get("name", menu.name).strip()
    if not updated_name or len(updated_name) > 200:
        return jsonify({"error": "Name must be 1-200 characters"}), 400
    menu.name = updated_name
    new_slug = data.get("slug", menu.slug).strip()
    if new_slug != menu.slug:
        if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', new_slug):
            return jsonify({"error": "Slug must contain only lowercase letters, numbers, and hyphens"}), 400
        if Menu.query.filter_by(slug=new_slug).first():
            return jsonify({"error": "Slug already exists"}), 400
        menu.slug = new_slug
    menu.description = data.get("description", menu.description)
    menu.icon = data.get("icon", menu.icon)
    menu.display_order = data.get("display_order", menu.display_order)
    menu.active = data.get("active", menu.active)
    db.session.commit()
    return jsonify({"message": "Menu updated"})


@admin_bp.route("/menus/<int:menu_id>", methods=["DELETE"])
@login_required
def delete_menu(menu_id):
    menu = Menu.query.get_or_404(menu_id)
    db.session.delete(menu)
    db.session.commit()
    return jsonify({"message": "Menu deleted"})


# ── Dish CRUD ──────────────────────────────────────────

def _resolve_menu_id(data):
    """Resolve menu_id from either menu_id or menu_slug in request data."""
    menu_id = data.get("menu_id")
    if menu_id is not None:
        return menu_id
    menu_slug = data.get("menu_slug")
    if menu_slug:
        menu = Menu.query.filter_by(slug=menu_slug).first()
        if menu:
            return menu.id
    return None


@admin_bp.route("/dishes", methods=["GET"])
@login_required
def list_dishes():
    dishes = MenuItem.query.order_by(MenuItem.id.desc()).all()
    result = []
    for dish in dishes:
        allergens = []
        for ma in dish.allergens:
            if not ma.allergen:
                continue
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
            "category": dish.category,
            "is_special": dish.is_special,
            "image_url": dish.image_url,
            "menu_id": dish.menu_id,
            "menu_name": dish.menu.name if dish.menu else None,
            "menu_slug": dish.menu.slug if dish.menu else None,
            "dietary_labels": dish.dietary_labels,
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

    if not name or len(name) > 200:
        return jsonify({"error": "Name must be 1-200 characters"}), 400
    try:
        price = float(price)
    except (TypeError, ValueError):
        return jsonify({"error": "Price must be a number"}), 400
    if price < 0 or price > 9999:
        return jsonify({"error": "Price must be between 0 and 9999"}), 400

    category = data.get("category", "Mains")
    is_special = data.get("is_special", False)
    image_url = data.get("image_url", "")
    menu_id = _resolve_menu_id(data)

    dietary_labels = data.get("dietary_labels", "")
    dish = MenuItem(name=name, description=description, price=float(price), active=True,
                    category=category, is_special=is_special, image_url=image_url,
                    menu_id=menu_id, dietary_labels=dietary_labels)
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

    updated_name = data.get("name", dish.name).strip()
    if not updated_name or len(updated_name) > 200:
        return jsonify({"error": "Name must be 1-200 characters"}), 400
    try:
        updated_price = float(data.get("price", dish.price))
    except (TypeError, ValueError):
        return jsonify({"error": "Price must be a number"}), 400
    if updated_price < 0 or updated_price > 9999:
        return jsonify({"error": "Price must be between 0 and 9999"}), 400

    dish.name = updated_name
    dish.description = data.get("description", dish.description).strip()
    dish.price = updated_price
    dish.category = data.get("category", dish.category)
    dish.is_special = data.get("is_special", dish.is_special)
    dish.image_url = data.get("image_url", dish.image_url)
    dish.dietary_labels = data.get("dietary_labels", dish.dietary_labels)

    # Update menu assignment if provided
    if "menu_id" in data or "menu_slug" in data:
        dish.menu_id = _resolve_menu_id(data)

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


@admin_bp.route("/dishes/<int:dish_id>/toggle-special", methods=["PATCH"])
@login_required
def toggle_special(dish_id):
    dish = MenuItem.query.get_or_404(dish_id)
    dish.is_special = not dish.is_special
    db.session.commit()
    return jsonify({"is_special": dish.is_special})


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


MENU_CATEGORIES = ["Starters", "Mains", "Desserts", "Sides", "Specials"]


@admin_bp.route("/categories", methods=["GET"])
@login_required
def get_categories():
    return jsonify(MENU_CATEGORIES)


@admin_bp.route("/detect-allergens", methods=["POST"])
@login_required
def detect_allergens():
    data = request.get_json()
    ingredients_text = data.get("ingredients", "")
    api_key = current_app.config.get("ANTHROPIC_API_KEY", "")
    result = parse_and_detect(ingredients_text, api_key)
    return jsonify(result)


# ── Orders ──────────────────────────────────────────

@admin_bp.route("/orders", methods=["GET"])
@login_required
def list_orders():
    """List all orders, newest first. Optional ?status= filter."""
    status_filter = request.args.get("status")
    query = Order.query.order_by(Order.created_at.desc())
    if status_filter:
        query = query.filter_by(status=status_filter)
    orders = query.limit(100).all()
    result = []
    for order in orders:
        result.append({
            "id": order.id,
            "table_number": order.table_number,
            "customer_name": order.customer_name,
            "notes": order.notes,
            "status": order.status,
            "created_at": order.created_at.isoformat() if order.created_at else None,
            "updated_at": order.updated_at.isoformat() if order.updated_at else None,
            "items": [
                {
                    "id": oi.id,
                    "menu_item_id": oi.menu_item_id,
                    "name": oi.menu_item.name if oi.menu_item else "Unknown",
                    "price": oi.menu_item.price if oi.menu_item else 0,
                    "quantity": oi.quantity,
                    "notes": oi.notes,
                }
                for oi in order.items
            ],
        })
    return jsonify(result)


@admin_bp.route("/orders/<int:order_id>/status", methods=["PATCH"])
@login_required
def update_order_status(order_id):
    """Update order status."""
    order = Order.query.get_or_404(order_id)
    data = request.get_json()
    new_status = data.get("status", "").strip()
    valid = ["pending", "confirmed", "preparing", "ready", "served", "cancelled"]
    if new_status not in valid:
        return jsonify({"error": f"Invalid status. Must be one of: {', '.join(valid)}"}), 400
    order.status = new_status
    db.session.commit()
    return jsonify({"id": order.id, "status": order.status})


# ── Pairings ──────────────────────────────────────────

@admin_bp.route("/pairings", methods=["GET"])
@login_required
def list_pairings():
    pairings = Pairing.query.all()
    result = []
    for p in pairings:
        if not p.food_item or not p.drink_item:
            continue
        result.append({
            "id": p.id,
            "food_item_id": p.food_item_id,
            "food_name": p.food_item.name,
            "drink_item_id": p.drink_item_id,
            "drink_name": p.drink_item.name,
            "note": p.note,
        })
    return jsonify(result)

@admin_bp.route("/pairings", methods=["POST"])
@login_required
def create_pairing():
    data = request.get_json()
    food_item_id = data.get("food_item_id")
    drink_item_id = data.get("drink_item_id")
    note = data.get("note", "")
    if not food_item_id or not drink_item_id:
        return jsonify({"error": "food_item_id and drink_item_id required"}), 400
    p = Pairing(food_item_id=food_item_id, drink_item_id=drink_item_id, note=note)
    db.session.add(p)
    db.session.commit()
    return jsonify({"id": p.id, "message": "Pairing created"}), 201

@admin_bp.route("/pairings/<int:pairing_id>", methods=["DELETE"])
@login_required
def delete_pairing(pairing_id):
    p = Pairing.query.get_or_404(pairing_id)
    db.session.delete(p)
    db.session.commit()
    return jsonify({"message": "Pairing deleted"})


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

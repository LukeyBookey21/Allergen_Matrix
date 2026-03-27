import re
from functools import wraps

from flask import Blueprint, request, jsonify, current_app
from flask_login import login_user, logout_user, login_required, current_user
from werkzeug.security import check_password_hash
import io
import qrcode
from flask import send_file

from models import db, AdminUser, Menu, MenuItem, Ingredient, Allergen, MenuItemAllergen, Order, OrderItem, Pairing, DishOption, PreOrder, PreOrderGuest, PreOrderItem
from parser import parse_and_detect

admin_bp = Blueprint("admin", __name__, url_prefix="/admin")


def chef_required(f):
    @wraps(f)
    @login_required
    def decorated(*args, **kwargs):
        if current_user.role not in ("chef", "manager"):
            return jsonify({"error": "Chef access required"}), 403
        return f(*args, **kwargs)
    return decorated


@admin_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    email = data.get("email", "")
    password = data.get("password", "")

    user = AdminUser.query.filter_by(email=email).first()
    if user and check_password_hash(user.password, password):
        login_user(user)
        return jsonify({"message": "Logged in", "email": user.email, "role": user.role})
    return jsonify({"error": "Invalid credentials"}), 401


@admin_bp.route("/logout", methods=["GET", "POST"])
@login_required
def logout():
    logout_user()
    return jsonify({"message": "Logged out"})


@admin_bp.route("/me", methods=["GET"])
@login_required
def me():
    return jsonify({"email": current_user.email, "role": current_user.role or "chef"})


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
@chef_required
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
@chef_required
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
@chef_required
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
@chef_required
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
@chef_required
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
@chef_required
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
@chef_required
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
@chef_required
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
@chef_required
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
@chef_required
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
@chef_required
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


# ── Pre-Orders ──────────────────────────────────────────

@admin_bp.route("/pre-orders", methods=["GET"])
@login_required
def list_pre_orders():
    orders = PreOrder.query.order_by(PreOrder.booking_date.desc(), PreOrder.booking_time.desc()).all()
    return jsonify([_serialize_pre_order_summary(po) for po in orders])

def _serialize_pre_order_summary(po):
    return {
        "id": po.id,
        "reference": po.reference,
        "contact_name": po.contact_name,
        "email": po.email,
        "party_size": po.party_size,
        "booking_date": po.booking_date,
        "booking_time": po.booking_time,
        "status": po.status,
        "payment_status": po.payment_status,
        "created_at": po.created_at.isoformat() if po.created_at else None,
    }

@admin_bp.route("/pre-orders/<int:po_id>", methods=["GET"])
@login_required
def get_pre_order_detail(po_id):
    po = PreOrder.query.get_or_404(po_id)
    # Reuse the public serializer from public routes
    from routes.public import _serialize_pre_order
    return jsonify(_serialize_pre_order(po))

@admin_bp.route("/pre-orders/<int:po_id>/status", methods=["PATCH"])
@login_required
def update_pre_order_status(po_id):
    po = PreOrder.query.get_or_404(po_id)
    data = request.get_json()
    new_status = data.get("status", "").strip()
    valid = ["pending", "confirmed", "amended", "cancelled"]
    if new_status not in valid:
        return jsonify({"error": f"Invalid status"}), 400
    po.status = new_status
    db.session.commit()
    return jsonify({"status": po.status})

@admin_bp.route("/pre-orders/<int:po_id>/kitchen-sheet", methods=["GET"])
@login_required
def download_kitchen_sheet(po_id):
    """Generate CSV kitchen sheet for a pre-order."""
    import csv
    import json as json_mod
    po = PreOrder.query.get_or_404(po_id)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Guest", "Seat", "Allergies", "Starter", "Main", "Main Options", "Dessert", "Notes"])

    for guest in po.guests:
        starter = ""
        main = ""
        main_options = ""
        dessert = ""
        notes_parts = []

        for item in guest.items:
            if item.skipped:
                dish_text = "— None —"
            elif item.menu_item:
                dish_text = item.menu_item.name
            else:
                dish_text = "Unknown"

            customisations = {}
            try:
                customisations = json_mod.loads(item.customisations) if item.customisations else {}
            except:
                pass

            custom_str = ", ".join(f"{v}" for k, v in customisations.items() if v and v != "None")

            if item.course == "starter":
                starter = dish_text
            elif item.course == "main":
                main = dish_text
                main_options = custom_str
            elif item.course == "dessert":
                dessert = dish_text

            if item.notes:
                notes_parts.append(item.notes)

        writer.writerow([
            guest.guest_name,
            guest.position,
            guest.allergen_names or "None",
            starter,
            main,
            main_options,
            dessert,
            "; ".join(notes_parts),
        ])

    # Summary row
    writer.writerow([])
    writer.writerow(["SUMMARY"])
    # Count dishes
    from collections import Counter
    dish_counts = Counter()
    for guest in po.guests:
        for item in guest.items:
            if not item.skipped and item.menu_item:
                customisations = {}
                try:
                    customisations = json_mod.loads(item.customisations) if item.customisations else {}
                except:
                    pass
                custom_str = ", ".join(f"{v}" for k, v in customisations.items() if v and v != "None")
                label = item.menu_item.name
                if custom_str:
                    label += f" ({custom_str})"
                dish_counts[label] += 1
    for dish, count in dish_counts.most_common():
        writer.writerow([f"{count}x", dish])

    output.seek(0)
    return send_file(
        io.BytesIO(output.getvalue().encode("utf-8")),
        mimetype="text/csv",
        download_name=f"kitchen-sheet-{po.reference}.csv",
    )


@admin_bp.route("/pre-orders/<int:po_id>/placecards", methods=["GET"])
@login_required
def download_placecards(po_id):
    """Generate printable HTML placecards."""
    import json as json_mod
    po = PreOrder.query.get_or_404(po_id)

    cards_html = []
    for guest in po.guests:
        courses_html = ""
        for item in guest.items:
            if item.skipped:
                continue
            if not item.menu_item:
                continue

            customisations = {}
            try:
                customisations = json_mod.loads(item.customisations) if item.customisations else {}
            except:
                pass

            custom_parts = [v for k, v in customisations.items() if v and v != "None"]

            course_label = item.course.title()
            dish_name = item.menu_item.name
            courses_html += f'<div class="course"><span class="course-label">{course_label}</span>'
            courses_html += f'<span class="dish-name">{dish_name}</span>'
            if custom_parts:
                courses_html += f'<span class="options">{", ".join(custom_parts)}</span>'
            courses_html += '</div>'

        allergens = guest.allergen_names if guest.allergen_names else "No allergies noted"

        cards_html.append(f'''
        <div class="card">
            <div class="guest-name">{guest.guest_name}</div>
            <div class="courses">{courses_html}</div>
            <div class="allergens">⚠ {allergens}</div>
        </div>
        ''')

    html = f'''<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Place Cards - {po.reference}</title>
<style>
    @media print {{ @page {{ size: A4; margin: 10mm; }} }}
    body {{ font-family: Georgia, serif; margin: 0; padding: 20px; background: #fff; }}
    .cards {{ display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }}
    .card {{
        border: 2px solid #1e293b;
        border-radius: 12px;
        padding: 24px;
        page-break-inside: avoid;
        min-height: 200px;
    }}
    .guest-name {{
        font-size: 22px;
        font-weight: bold;
        color: #1e293b;
        border-bottom: 2px solid #d97706;
        padding-bottom: 8px;
        margin-bottom: 16px;
    }}
    .course {{
        margin-bottom: 8px;
    }}
    .course-label {{
        display: block;
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: #94a3b8;
        margin-bottom: 2px;
    }}
    .dish-name {{
        display: block;
        font-size: 14px;
        color: #1e293b;
        font-weight: 600;
    }}
    .options {{
        display: block;
        font-size: 12px;
        color: #64748b;
        font-style: italic;
    }}
    .allergens {{
        margin-top: 16px;
        padding-top: 8px;
        border-top: 1px solid #e2e8f0;
        font-size: 11px;
        color: #ef4444;
    }}
    h1 {{
        font-size: 18px;
        color: #64748b;
        margin-bottom: 20px;
    }}
</style>
</head>
<body>
<h1>Place Cards — {po.reference} — {po.booking_date} at {po.booking_time}</h1>
<div class="cards">{"".join(cards_html)}</div>
</body>
</html>'''

    return send_file(
        io.BytesIO(html.encode("utf-8")),
        mimetype="text/html",
        download_name=f"placecards-{po.reference}.html",
    )


# ── Dish Options ──────────────────────────────────────────

@admin_bp.route("/dish-options", methods=["GET"])
@chef_required
def list_dish_options():
    options = DishOption.query.all()
    return jsonify([{
        "id": o.id,
        "menu_item_id": o.menu_item_id,
        "dish_name": o.menu_item.name if o.menu_item else None,
        "option_group": o.option_group,
        "option_name": o.option_name,
        "price_modifier": o.price_modifier,
        "is_required": o.is_required,
    } for o in options])

@admin_bp.route("/dish-options", methods=["POST"])
@chef_required
def create_dish_option():
    data = request.get_json()
    opt = DishOption(
        menu_item_id=data.get("menu_item_id"),
        option_group=data.get("option_group", ""),
        option_name=data.get("option_name", ""),
        price_modifier=data.get("price_modifier", 0),
        is_required=data.get("is_required", False),
        display_order=data.get("display_order", 0),
    )
    db.session.add(opt)
    db.session.commit()
    return jsonify({"id": opt.id}), 201

@admin_bp.route("/dish-options/<int:opt_id>", methods=["DELETE"])
@chef_required
def delete_dish_option(opt_id):
    opt = DishOption.query.get_or_404(opt_id)
    db.session.delete(opt)
    db.session.commit()
    return jsonify({"message": "Deleted"})


# ── Analytics ──────────────────────────────────────────

@admin_bp.route("/analytics", methods=["GET"])
@login_required
def get_analytics():
    """Return analytics data for the dashboard."""
    from datetime import datetime, timedelta
    from collections import Counter
    from sqlalchemy import func

    today = datetime.now().date()
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)

    # Total orders
    total_orders = Order.query.count()
    today_orders = Order.query.filter(func.date(Order.created_at) == today).count()
    week_orders = Order.query.filter(func.date(Order.created_at) >= week_ago).count()

    # Revenue (sum of item prices * quantities)
    all_order_items = db.session.query(
        OrderItem.menu_item_id, OrderItem.quantity
    ).all()

    total_revenue = 0.0
    today_revenue = 0.0
    dish_popularity = Counter()

    # Calculate revenue properly
    for order in Order.query.all():
        order_total = 0.0
        for oi in order.items:
            if oi.menu_item:
                item_total = oi.menu_item.price * oi.quantity
                order_total += item_total
                dish_popularity[oi.menu_item.name] += oi.quantity
        total_revenue += order_total
        if order.created_at and order.created_at.date() == today:
            today_revenue += order_total

    # Top dishes
    top_dishes = [{"name": name, "count": count} for name, count in dish_popularity.most_common(10)]

    # Order status breakdown
    status_counts = {}
    for status, count in db.session.query(Order.status, func.count(Order.id)).group_by(Order.status).all():
        status_counts[status] = count

    # Pre-orders stats
    total_pre_orders = PreOrder.query.count()
    upcoming_pre_orders = PreOrder.query.filter(
        PreOrder.booking_date >= today.isoformat(),
        PreOrder.status.in_(["pending", "confirmed"])
    ).count()

    # Allergen trends - which allergens appear most in orders
    allergen_counts = Counter()
    for order in Order.query.all():
        for oi in order.items:
            if oi.menu_item:
                for ma in oi.menu_item.allergens:
                    if ma.allergen:
                        allergen_counts[ma.allergen.name] += oi.quantity
    top_allergens = [{"name": name, "count": count} for name, count in allergen_counts.most_common(14)]

    # Menu item counts
    total_items = MenuItem.query.count()
    active_items = MenuItem.query.filter_by(active=True).count()

    # Average order value
    avg_order_value = round(total_revenue / total_orders, 2) if total_orders > 0 else 0

    # Orders by hour (for today)
    orders_by_hour = {}
    for order in Order.query.filter(func.date(Order.created_at) == today).all():
        if order.created_at:
            hour = order.created_at.strftime("%H:00")
            orders_by_hour[hour] = orders_by_hour.get(hour, 0) + 1

    return jsonify({
        "orders": {
            "total": total_orders,
            "today": today_orders,
            "this_week": week_orders,
        },
        "revenue": {
            "total": round(total_revenue, 2),
            "today": round(today_revenue, 2),
            "average_order": avg_order_value,
        },
        "top_dishes": top_dishes,
        "status_breakdown": status_counts,
        "pre_orders": {
            "total": total_pre_orders,
            "upcoming": upcoming_pre_orders,
        },
        "allergen_trends": top_allergens,
        "menu_items": {
            "total": total_items,
            "active": active_items,
        },
        "orders_by_hour": orders_by_hour,
    })

from flask import Blueprint, jsonify, request
from models import db, MenuItem, Allergen, Menu, Order, OrderItem, Pairing

public_bp = Blueprint("public", __name__, url_prefix="/api")


@public_bp.route("/menus", methods=["GET"])
def get_menus():
    """Return all active menus ordered by display_order."""
    menus = Menu.query.filter_by(active=True).order_by(Menu.display_order).all()
    return jsonify([
        {
            "id": m.id,
            "name": m.name,
            "slug": m.slug,
            "description": m.description,
            "icon": m.icon,
            "display_order": m.display_order,
        }
        for m in menus
    ])


@public_bp.route("/menu", methods=["GET"])
def get_menu():
    """Return active dishes. Optional ?menu=slug to filter by menu."""
    menu_slug = request.args.get("menu")

    query = MenuItem.query.filter_by(active=True)

    if menu_slug:
        menu = Menu.query.filter_by(slug=menu_slug, active=True).first()
        if not menu:
            return jsonify([])
        query = query.filter_by(menu_id=menu.id)

    dishes = query.order_by(MenuItem.name).all()
    result = []
    for dish in dishes:
        allergens = []
        for ma in dish.allergens:
            allergens.append({
                "id": ma.allergen.id,
                "name": ma.allergen.name,
                "icon_emoji": ma.allergen.icon_emoji,
            })
        dish_data = {
            "id": dish.id,
            "name": dish.name,
            "description": dish.description,
            "price": dish.price,
            "category": dish.category,
            "is_special": dish.is_special,
            "image_url": dish.image_url,
            "allergens": allergens,
            "menu_id": dish.menu_id,
            "menu_name": dish.menu.name if dish.menu else None,
            "menu_slug": dish.menu.slug if dish.menu else None,
        }
        result.append(dish_data)
    return jsonify(result)


@public_bp.route("/menu/allergens", methods=["GET"])
def get_allergens():
    allergens = Allergen.query.order_by(Allergen.name).all()
    return jsonify([
        {"id": a.id, "name": a.name, "icon_emoji": a.icon_emoji}
        for a in allergens
    ])


@public_bp.route("/menu/categories", methods=["GET"])
def get_categories():
    categories = ["Starters", "Mains", "Desserts", "Sides", "Specials"]
    return jsonify(categories)


@public_bp.route("/orders", methods=["POST"])
def create_order():
    """Customer places an order."""
    data = request.get_json()
    table_number = data.get("table_number", "").strip()
    customer_name = data.get("customer_name", "").strip()
    notes = data.get("notes", "").strip()
    items = data.get("items", [])

    if not table_number:
        return jsonify({"error": "Table number is required"}), 400
    if not items:
        return jsonify({"error": "Order must have at least one item"}), 400

    order = Order(table_number=table_number, customer_name=customer_name, notes=notes)
    db.session.add(order)
    db.session.flush()

    for item in items:
        menu_item_id = item.get("menu_item_id")
        quantity = item.get("quantity", 1)
        item_notes = item.get("notes", "")
        if menu_item_id:
            oi = OrderItem(order_id=order.id, menu_item_id=menu_item_id, quantity=quantity, notes=item_notes)
            db.session.add(oi)

    db.session.commit()
    return jsonify({"id": order.id, "message": "Order placed", "status": "pending"}), 201


@public_bp.route("/pairings/<int:dish_id>", methods=["GET"])
def get_pairings(dish_id):
    """Get drink pairings for a dish."""
    pairings = Pairing.query.filter_by(food_item_id=dish_id).all()
    return jsonify([
        {
            "id": p.id,
            "drink": {
                "id": p.drink_item.id,
                "name": p.drink_item.name,
                "description": p.drink_item.description,
                "price": p.drink_item.price,
                "category": p.drink_item.category,
            },
            "note": p.note,
        }
        for p in pairings
    ])

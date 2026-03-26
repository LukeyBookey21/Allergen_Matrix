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

    dishes = query.order_by(MenuItem.id).all()
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
            "dietary_labels": dish.dietary_labels,
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

    if not table_number or len(table_number) > 20:
        return jsonify({"error": "Table number is required and must be 1-20 characters"}), 400
    if not isinstance(items, list) or not items:
        return jsonify({"error": "Order must have a non-empty list of items"}), 400

    # Validate each item
    for item in items:
        menu_item_id = item.get("menu_item_id")
        quantity = item.get("quantity", 1)
        if not menu_item_id or not isinstance(menu_item_id, int):
            return jsonify({"error": "Each item must have a valid menu_item_id"}), 400
        if not isinstance(quantity, int) or quantity < 1 or quantity > 99:
            return jsonify({"error": "Quantity must be an integer between 1 and 99"}), 400
        menu_item = MenuItem.query.get(menu_item_id)
        if not menu_item or not menu_item.active:
            return jsonify({"error": f"Item '{menu_item_id}' is not available"}), 400

    order = Order(table_number=table_number, customer_name=customer_name, notes=notes)
    db.session.add(order)
    db.session.flush()

    for item in items:
        menu_item_id = item.get("menu_item_id")
        quantity = item.get("quantity", 1)
        item_notes = item.get("notes", "")
        oi = OrderItem(order_id=order.id, menu_item_id=menu_item_id, quantity=quantity, notes=item_notes)
        db.session.add(oi)

    db.session.commit()

    # Return full order data
    order_items = []
    total = 0.0
    for oi in order.items:
        item_price = oi.menu_item.price if oi.menu_item else 0
        item_total = item_price * oi.quantity
        total += item_total
        order_items.append({
            "id": oi.id,
            "menu_item_id": oi.menu_item_id,
            "name": oi.menu_item.name if oi.menu_item else "Unknown",
            "price": item_price,
            "quantity": oi.quantity,
            "notes": oi.notes,
        })

    return jsonify({
        "id": order.id,
        "table_number": order.table_number,
        "customer_name": order.customer_name,
        "notes": order.notes,
        "status": order.status,
        "items": order_items,
        "total": round(total, 2),
        "message": "Order placed",
    }), 201


@public_bp.route("/orders/<int:order_id>", methods=["GET"])
def get_order_status(order_id):
    """Customer can check their order status."""
    order = Order.query.get_or_404(order_id)
    order_items = []
    total = 0.0
    for oi in order.items:
        item_price = oi.menu_item.price if oi.menu_item else 0
        item_total = item_price * oi.quantity
        total += item_total
        order_items.append({
            "name": oi.menu_item.name if oi.menu_item else "Unknown",
            "quantity": oi.quantity,
            "price": item_price,
        })
    return jsonify({
        "id": order.id,
        "table_number": order.table_number,
        "status": order.status,
        "items": order_items,
        "total": round(total, 2),
        "created_at": order.created_at.isoformat() if order.created_at else None,
    })


@public_bp.route("/pairings/<int:dish_id>", methods=["GET"])
def get_pairings(dish_id):
    """Get drink pairings for a dish."""
    pairings = Pairing.query.filter_by(food_item_id=dish_id).all()
    result = []
    for p in pairings:
        if not p.drink_item:
            continue
        result.append({
            "id": p.id,
            "drink": {
                "id": p.drink_item.id,
                "name": p.drink_item.name,
                "description": p.drink_item.description,
                "price": p.drink_item.price,
                "category": p.drink_item.category,
            },
            "note": p.note,
        })
    return jsonify(result)

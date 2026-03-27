import json
import logging
import string
import random

from flask import Blueprint, jsonify, request
from models import db, MenuItem, Allergen, Menu, Order, OrderItem, Pairing, DishOption, PreOrder, PreOrderGuest, PreOrderItem

logger = logging.getLogger(__name__)

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
    customer_email = data.get("customer_email", "").strip()
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

    order = Order(table_number=table_number, customer_name=customer_name, customer_email=customer_email, notes=notes)
    db.session.add(order)
    db.session.flush()

    for item in items:
        menu_item_id = item.get("menu_item_id")
        quantity = item.get("quantity", 1)
        item_notes = item.get("notes", "")
        oi = OrderItem(order_id=order.id, menu_item_id=menu_item_id, quantity=quantity, notes=item_notes)
        db.session.add(oi)

    db.session.commit()

    # Return full order data — also used for admin email
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

    # Send emails
    try:
        from email_service import send_order_admin_notification, send_order_customer_receipt
        send_order_admin_notification(order, order_items, total)
        if customer_email:
            send_order_customer_receipt(order, order_items, total)
    except Exception as e:
        logger.warning("Email sending failed for order %s: %s", order.id, e)

    return jsonify({
        "id": order.id,
        "table_number": order.table_number,
        "customer_name": order.customer_name,
        "customer_email": order.customer_email,
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


@public_bp.route("/dish-options/<int:dish_id>", methods=["GET"])
def get_dish_options(dish_id):
    """Get customisation options for a dish."""
    options = DishOption.query.filter_by(menu_item_id=dish_id).order_by(DishOption.display_order).all()
    grouped = {}
    for opt in options:
        if opt.option_group not in grouped:
            grouped[opt.option_group] = {"group": opt.option_group, "is_required": opt.is_required, "options": []}
        grouped[opt.option_group]["options"].append({
            "id": opt.id,
            "name": opt.option_name,
            "price_modifier": opt.price_modifier,
        })
    return jsonify(list(grouped.values()))


def _generate_reference():
    """Generate a unique pre-order reference like PO-A3K9."""
    while True:
        ref = "PO-" + ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
        if not PreOrder.query.filter_by(reference=ref).first():
            return ref


@public_bp.route("/pre-orders", methods=["POST"])
def create_pre_order():
    """Customer submits a group pre-order."""
    data = request.get_json()

    contact_name = data.get("contact_name", "").strip()
    email = data.get("email", "").strip()
    phone = data.get("phone", "").strip()
    party_size = data.get("party_size", 0)
    booking_date = data.get("booking_date", "").strip()
    booking_time = data.get("booking_time", "").strip()
    special_notes = data.get("special_notes", "").strip()
    guests = data.get("guests", [])

    # Validation
    if not contact_name or not email or not booking_date or not booking_time:
        return jsonify({"error": "Contact name, email, date and time are required"}), 400
    if not isinstance(party_size, int) or party_size < 8 or party_size > 50:
        return jsonify({"error": "Party size must be between 8 and 50"}), 400
    if not isinstance(guests, list) or len(guests) == 0:
        return jsonify({"error": "Guest orders are required"}), 400
    if len(guests) != party_size:
        return jsonify({"error": f"Expected {party_size} guests but got {len(guests)}"}), 400

    reference = _generate_reference()

    pre_order = PreOrder(
        reference=reference,
        contact_name=contact_name,
        email=email,
        phone=phone,
        party_size=party_size,
        booking_date=booking_date,
        booking_time=booking_time,
        special_notes=special_notes,
    )
    db.session.add(pre_order)
    db.session.flush()

    for i, guest_data in enumerate(guests):
        guest = PreOrderGuest(
            pre_order_id=pre_order.id,
            guest_name=guest_data.get("name", f"Guest {i+1}").strip(),
            position=i + 1,
            dietary_notes=guest_data.get("dietary_notes", ""),
            allergen_names=",".join(guest_data.get("allergens", [])),
        )
        db.session.add(guest)
        db.session.flush()

        for course_data in guest_data.get("courses", []):
            item = PreOrderItem(
                guest_id=guest.id,
                menu_item_id=course_data.get("menu_item_id"),
                course=course_data.get("course", ""),
                skipped=course_data.get("skipped", False),
                customisations=json.dumps(course_data.get("customisations", {})),
                notes=course_data.get("notes", ""),
            )
            db.session.add(item)

    db.session.commit()

    # Send emails
    try:
        from email_service import send_pre_order_confirmation, send_pre_order_admin_notification
        send_pre_order_confirmation(pre_order)
        send_pre_order_admin_notification(pre_order)
    except Exception as e:
        logger.warning("Email sending failed for pre-order %s: %s", pre_order.reference, e)

    return jsonify({
        "id": pre_order.id,
        "reference": reference,
        "message": "Pre-order submitted",
        "status": "pending",
    }), 201


@public_bp.route("/pre-orders/<ref>", methods=["GET"])
def get_pre_order(ref):
    """Get pre-order details by reference."""
    po = PreOrder.query.filter_by(reference=ref.upper()).first_or_404()
    return jsonify(_serialize_pre_order(po))


def _serialize_pre_order(po):
    """Serialize a pre-order to JSON."""
    guests = []
    total = 0.0
    for guest in po.guests:
        courses = []
        for item in guest.items:
            customisations = {}
            try:
                customisations = json.loads(item.customisations) if item.customisations else {}
            except:
                pass
            item_price = 0
            item_name = "Skipped"
            if not item.skipped and item.menu_item:
                item_price = item.menu_item.price
                item_name = item.menu_item.name
                # Add price modifiers from customisations
                # (simplified — just track base price for now)
            total += item_price
            courses.append({
                "course": item.course,
                "skipped": item.skipped,
                "dish_name": item_name,
                "dish_id": item.menu_item_id,
                "price": item_price,
                "customisations": customisations,
                "notes": item.notes,
            })
        guests.append({
            "name": guest.guest_name,
            "position": guest.position,
            "allergens": guest.allergen_names.split(",") if guest.allergen_names else [],
            "dietary_notes": guest.dietary_notes,
            "courses": courses,
        })
    return {
        "id": po.id,
        "reference": po.reference,
        "contact_name": po.contact_name,
        "email": po.email,
        "phone": po.phone,
        "party_size": po.party_size,
        "booking_date": po.booking_date,
        "booking_time": po.booking_time,
        "special_notes": po.special_notes,
        "status": po.status,
        "payment_status": po.payment_status,
        "total": round(total, 2),
        "guests": guests,
        "created_at": po.created_at.isoformat() if po.created_at else None,
    }

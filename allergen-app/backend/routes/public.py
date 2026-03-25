from flask import Blueprint, jsonify
from models import MenuItem, Allergen

public_bp = Blueprint("public", __name__)


@public_bp.route("/menu", methods=["GET"])
def get_menu():
    dishes = MenuItem.query.filter_by(active=True).order_by(MenuItem.name).all()
    result = []
    for dish in dishes:
        allergens = []
        for ma in dish.allergens:
            allergens.append({
                "id": ma.allergen.id,
                "name": ma.allergen.name,
                "icon_emoji": ma.allergen.icon_emoji,
            })
        result.append({
            "id": dish.id,
            "name": dish.name,
            "description": dish.description,
            "price": dish.price,
            "allergens": allergens,
        })
    return jsonify(result)


@public_bp.route("/menu/allergens", methods=["GET"])
def get_allergens():
    allergens = Allergen.query.order_by(Allergen.name).all()
    return jsonify([
        {"id": a.id, "name": a.name, "icon_emoji": a.icon_emoji}
        for a in allergens
    ])

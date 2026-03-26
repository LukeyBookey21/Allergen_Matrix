from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin

db = SQLAlchemy()


class AdminUser(UserMixin, db.Model):
    __tablename__ = "admin_user"
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)


class Menu(db.Model):
    __tablename__ = "menu"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)  # e.g. "Dinner Menu", "Bar & Lounge", "Afternoon Tea"
    slug = db.Column(db.String(100), unique=True, nullable=False)  # URL-friendly name
    description = db.Column(db.Text, default="")
    icon = db.Column(db.String(10), default="")  # emoji icon
    display_order = db.Column(db.Integer, default=0)
    active = db.Column(db.Boolean, default=True)
    items = db.relationship("MenuItem", backref="menu", lazy=True)


class MenuItem(db.Model):
    __tablename__ = "menu_item"
    id = db.Column(db.Integer, primary_key=True)
    menu_id = db.Column(db.Integer, db.ForeignKey("menu.id"), nullable=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, default="")
    price = db.Column(db.Float, nullable=False)
    active = db.Column(db.Boolean, default=True)
    category = db.Column(db.String(50), default="Mains")
    is_special = db.Column(db.Boolean, default=False)
    image_url = db.Column(db.String(500), default="")
    ingredients = db.relationship("Ingredient", backref="menu_item", cascade="all, delete-orphan")
    allergens = db.relationship("MenuItemAllergen", backref="menu_item", cascade="all, delete-orphan")


class Ingredient(db.Model):
    __tablename__ = "ingredient"
    id = db.Column(db.Integer, primary_key=True)
    menu_item_id = db.Column(db.Integer, db.ForeignKey("menu_item.id"), nullable=False)
    raw_text = db.Column(db.String(300), nullable=False)
    parsed_name = db.Column(db.String(200), default="")


class Allergen(db.Model):
    __tablename__ = "allergen"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    icon_emoji = db.Column(db.String(10), default="")


class MenuItemAllergen(db.Model):
    __tablename__ = "menu_item_allergen"
    id = db.Column(db.Integer, primary_key=True)
    menu_item_id = db.Column(db.Integer, db.ForeignKey("menu_item.id"), nullable=False)
    allergen_id = db.Column(db.Integer, db.ForeignKey("allergen.id"), nullable=False)
    auto_detected = db.Column(db.Boolean, default=True)
    manually_overridden = db.Column(db.Boolean, default=False)
    allergen = db.relationship("Allergen")


SEED_ALLERGENS = [
    ("Celery", "\U0001f33f"),
    ("Gluten", "\U0001f33e"),
    ("Crustaceans", "\U0001f990"),
    ("Eggs", "\U0001f95a"),
    ("Fish", "\U0001f41f"),
    ("Lupin", "\U0001f338"),
    ("Milk", "\U0001f95b"),
    ("Molluscs", "\U0001f991"),
    ("Mustard", "\U0001f7e1"),
    ("Peanuts", "\U0001f95c"),
    ("Sesame", "\U0001f330"),
    ("Soybeans", "\U0001fad8"),
    ("Sulphites", "\U0001f377"),
    ("Tree Nuts", "\U0001f333"),
]


def seed_allergens():
    for name, emoji in SEED_ALLERGENS:
        if not Allergen.query.filter_by(name=name).first():
            db.session.add(Allergen(name=name, icon_emoji=emoji))
    db.session.commit()


SEED_MENUS = [
    {"name": "Dinner Menu", "slug": "dinner", "description": "The Curious Kitchen evening menu", "icon": "\U0001f37d\ufe0f", "display_order": 1},
    {"name": "Bar & Lounge", "slug": "bar-lounge", "description": "All-day bar and lounge menu", "icon": "\U0001f378", "display_order": 2},
    {"name": "Afternoon Tea", "slug": "afternoon-tea", "description": "Traditional afternoon tea - \u00a328.95 per person. Add Prosecco \u00a334.95 / Champagne \u00a339.95", "icon": "\U0001fad6", "display_order": 3},
    {"name": "Sunday Lunch", "slug": "sunday-lunch", "description": "Sunday roast and classics", "icon": "\U0001f969", "display_order": 4},
    {"name": "Drinks", "slug": "drinks", "description": "Wines, cocktails, beers and spirits", "icon": "\U0001f377", "display_order": 5},
]


def seed_menus():
    for menu_data in SEED_MENUS:
        if not Menu.query.filter_by(slug=menu_data["slug"]).first():
            db.session.add(Menu(**menu_data))
    db.session.commit()

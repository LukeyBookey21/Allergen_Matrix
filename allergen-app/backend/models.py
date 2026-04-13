import secrets

from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin

db = SQLAlchemy()


class AdminUser(UserMixin, db.Model):
    __tablename__ = "admin_user"
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    role = db.Column(db.String(20), default="chef")  # "chef", "foh", "manager"


class Menu(db.Model):
    __tablename__ = "menu"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)  # e.g. "Dinner Menu", "Bar & Lounge", "Afternoon Tea"
    slug = db.Column(db.String(100), unique=True, nullable=False)  # URL-friendly name
    description = db.Column(db.Text, default="")
    icon = db.Column(db.String(10), default="")  # emoji icon
    display_order = db.Column(db.Integer, default=0)
    active = db.Column(db.Boolean, default=True)
    active_from = db.Column(db.String(5), default="")  # "12:00" or empty for always
    active_to = db.Column(db.String(5), default="")    # "21:30" or empty for always
    available_days = db.Column(db.String(50), default="")  # "mon,tue,wed,thu,fri,sat,sun" or empty for all
    items = db.relationship("MenuItem", backref="menu", lazy=True)


class MenuItem(db.Model):
    __tablename__ = "menu_item"
    __table_args__ = (db.CheckConstraint('price >= 0', name='ck_menu_item_price'),)
    id = db.Column(db.Integer, primary_key=True)
    menu_id = db.Column(db.Integer, db.ForeignKey("menu.id"), nullable=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, default="")
    price = db.Column(db.Float, nullable=False)
    active = db.Column(db.Boolean, default=True)
    category = db.Column(db.String(50), default="Mains")
    is_special = db.Column(db.Boolean, default=False)
    image_url = db.Column(db.String(500), default="")
    dietary_labels = db.Column(db.String(100), default="")
    display_order = db.Column(db.Integer, default=0)
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
    __table_args__ = (db.UniqueConstraint('menu_item_id', 'allergen_id', name='uq_menu_item_allergen'),)
    id = db.Column(db.Integer, primary_key=True)
    menu_item_id = db.Column(db.Integer, db.ForeignKey("menu_item.id"), nullable=False)
    allergen_id = db.Column(db.Integer, db.ForeignKey("allergen.id"), nullable=False)
    auto_detected = db.Column(db.Boolean, default=True)
    manually_overridden = db.Column(db.Boolean, default=False)
    allergen = db.relationship("Allergen")


class Order(db.Model):
    __tablename__ = "order"
    id = db.Column(db.Integer, primary_key=True)
    table_number = db.Column(db.String(20), nullable=False)
    customer_name = db.Column(db.String(100), default="")
    customer_email = db.Column(db.String(200), default="")
    notes = db.Column(db.Text, default="")
    lookup_token = db.Column(db.String(64), default=lambda: secrets.token_hex(16))
    service_charge = db.Column(db.Float, default=0.0)
    status = db.Column(db.String(30), default="pending")  # pending, confirmed, preparing, ready, served, cancelled
    created_at = db.Column(db.DateTime, default=db.func.now())
    updated_at = db.Column(db.DateTime, default=db.func.now(), onupdate=db.func.now())
    items = db.relationship("OrderItem", backref="order", cascade="all, delete-orphan")

class OrderItem(db.Model):
    __tablename__ = "order_item"
    __table_args__ = (db.CheckConstraint('quantity >= 1', name='ck_order_item_quantity'),)
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey("order.id"), nullable=False)
    menu_item_id = db.Column(db.Integer, db.ForeignKey("menu_item.id"), nullable=False)
    quantity = db.Column(db.Integer, default=1)
    notes = db.Column(db.String(300), default="")
    menu_item = db.relationship("MenuItem")

class Pairing(db.Model):
    __tablename__ = "pairing"
    id = db.Column(db.Integer, primary_key=True)
    food_item_id = db.Column(db.Integer, db.ForeignKey("menu_item.id"), nullable=False)
    drink_item_id = db.Column(db.Integer, db.ForeignKey("menu_item.id"), nullable=False)
    note = db.Column(db.String(200), default="")  # e.g. "Complements the richness"
    food_item = db.relationship("MenuItem", foreign_keys=[food_item_id])
    drink_item = db.relationship("MenuItem", foreign_keys=[drink_item_id])


class DishOption(db.Model):
    __tablename__ = "dish_option"
    id = db.Column(db.Integer, primary_key=True)
    menu_item_id = db.Column(db.Integer, db.ForeignKey("menu_item.id"), nullable=False)
    option_group = db.Column(db.String(50), nullable=False)  # "Cooking", "Sauce", "Side", "Protein", "Extras"
    option_name = db.Column(db.String(100), nullable=False)  # "Medium Rare", "Peppercorn", "Chips"
    price_modifier = db.Column(db.Float, default=0.0)
    is_required = db.Column(db.Boolean, default=False)  # False = optional, user can skip
    display_order = db.Column(db.Integer, default=0)
    menu_item = db.relationship("MenuItem", backref="options")


class PreOrder(db.Model):
    __tablename__ = "pre_order"
    id = db.Column(db.Integer, primary_key=True)
    reference = db.Column(db.String(20), unique=True, nullable=False)  # e.g. "PO-A3K9"
    contact_name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(200), nullable=False)
    phone = db.Column(db.String(30), default="")
    party_size = db.Column(db.Integer, nullable=False)
    booking_date = db.Column(db.String(20), nullable=False)  # "2026-04-15"
    booking_time = db.Column(db.String(10), nullable=False)  # "19:00"
    special_notes = db.Column(db.Text, default="")
    amendment_token = db.Column(db.String(64), default=lambda: secrets.token_hex(16))
    status = db.Column(db.String(30), default="pending")  # pending, confirmed, amended, cancelled
    payment_status = db.Column(db.String(30), default="unpaid")  # unpaid, deposit, paid
    created_at = db.Column(db.DateTime, default=db.func.now())
    updated_at = db.Column(db.DateTime, default=db.func.now(), onupdate=db.func.now())
    guests = db.relationship("PreOrderGuest", backref="pre_order", cascade="all, delete-orphan", order_by="PreOrderGuest.position")


class PreOrderGuest(db.Model):
    __tablename__ = "pre_order_guest"
    id = db.Column(db.Integer, primary_key=True)
    pre_order_id = db.Column(db.Integer, db.ForeignKey("pre_order.id"), nullable=False)
    guest_name = db.Column(db.String(100), nullable=False)
    position = db.Column(db.Integer, default=1)  # seat number
    dietary_notes = db.Column(db.String(200), default="")
    allergen_names = db.Column(db.String(500), default="")  # comma-separated: "Gluten,Milk"
    items = db.relationship("PreOrderItem", backref="guest", cascade="all, delete-orphan")


class PreOrderItem(db.Model):
    __tablename__ = "pre_order_item"
    id = db.Column(db.Integer, primary_key=True)
    guest_id = db.Column(db.Integer, db.ForeignKey("pre_order_guest.id"), nullable=False)
    menu_item_id = db.Column(db.Integer, db.ForeignKey("menu_item.id"), nullable=True)  # null = skipped course
    course = db.Column(db.String(20), nullable=False)  # "starter", "main", "dessert", "drink"
    skipped = db.Column(db.Boolean, default=False)
    customisations = db.Column(db.Text, default="{}")  # JSON: {"cooking": "Medium Rare", "sauce": "Peppercorn"}
    notes = db.Column(db.String(300), default="")
    menu_item = db.relationship("MenuItem")


class Translation(db.Model):
    __tablename__ = "translation"
    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(200), nullable=False)  # e.g. "dish.42.name" or "ui.menu_title"
    language = db.Column(db.String(5), nullable=False)  # "es", "fr", "de"
    value = db.Column(db.Text, nullable=False)
    __table_args__ = (db.UniqueConstraint('key', 'language', name='uq_translation_key_lang'),)


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
    {"name": "Dinner Menu", "slug": "dinner", "description": "The Curious Kitchen evening menu", "icon": "\U0001f37d\ufe0f", "display_order": 1, "active_from": "18:00", "active_to": "22:00", "available_days": "mon,tue,wed,thu,fri,sat,sun"},
    {"name": "Bar & Lounge", "slug": "bar-lounge", "description": "All-day bar and lounge menu", "icon": "\U0001f378", "display_order": 2, "active_from": "10:00", "active_to": "23:00", "available_days": "mon,tue,wed,thu,fri,sat,sun"},
    {"name": "Afternoon Tea", "slug": "afternoon-tea", "description": "Traditional afternoon tea - \u00a328.95 per person. Add Prosecco \u00a334.95 / Champagne \u00a339.95", "icon": "\U0001fad6", "display_order": 3, "active_from": "14:00", "active_to": "17:00", "available_days": "mon,tue,wed,thu,fri,sat,sun"},
    {"name": "Sunday Lunch", "slug": "sunday-lunch", "description": "Sunday roast and classics", "icon": "\U0001f969", "display_order": 4, "active_from": "12:00", "active_to": "16:00", "available_days": "sun"},
    {"name": "Drinks", "slug": "drinks", "description": "Wines, cocktails, beers and spirits", "icon": "\U0001f377", "display_order": 5, "active_from": "10:00", "active_to": "23:00", "available_days": "mon,tue,wed,thu,fri,sat,sun"},
]


def seed_menus():
    for menu_data in SEED_MENUS:
        if not Menu.query.filter_by(slug=menu_data["slug"]).first():
            db.session.add(Menu(**menu_data))
    db.session.commit()

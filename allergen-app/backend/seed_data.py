"""Seed the database with full restaurant menu dishes across all menus."""
from models import db, Menu, MenuItem, Ingredient, Allergen, MenuItemAllergen, Pairing
from parser import parse_and_detect


SAMPLE_DISHES = [
    # ──────────────────────────────────────────────
    # DINNER MENU
    # ──────────────────────────────────────────────
    # Starters
    {
        "menu_slug": "dinner",
        "name": "Heritage Beetroot Textures",
        "description": "Black garlic yogurt, pickled red onion, toasted sunflower seeds, goats cheese pearls",
        "price": 8.95,
        "category": "Starters",
        "ingredients": "heritage beetroot\nblack garlic\nyogurt\nred onion\nvinegar\nsunflower seeds\ngoats cheese",
        "dietary": "V",
    },
    {
        "menu_slug": "dinner",
        "name": "Chilled Prawns & Crayfish Tails",
        "description": "Avocado mousse, bloody Mary dressing, lemon gel, pickled samphire",
        "price": 10.50,
        "category": "Starters",
        "ingredients": "prawns\ncrayfish tails\navocado\ntomato juice\nhorseradish\nWorcestershire sauce\nlemon\nsamphire\ncelery salt",
    },
    {
        "menu_slug": "dinner",
        "name": "Whipped Chicken Liver Parfait",
        "description": "Rhubarb puree, granola, toasted brioche",
        "price": 9.50,
        "category": "Starters",
        "ingredients": "chicken livers\nbutter\ncream\nbrandy\nrhubarb\ngranola\nbrioche",
    },
    {
        "menu_slug": "dinner",
        "name": "Soup of the Day",
        "description": "Freshly prepared with artisan bread",
        "price": 7.50,
        "category": "Starters",
        "ingredients": "seasonal vegetables\nvegetable stock\nbutter\nbread roll\ncream",
    },
    {
        "menu_slug": "dinner",
        "name": "Goats Cheese Crotin",
        "description": "Textures of beetroot, pistachio crumb, balsamic reduction",
        "price": 9.50,
        "category": "Starters",
        "ingredients": "goats cheese\nbeetroot\npistachio\nbalsamic vinegar\nmixed leaves\nolive oil",
        "dietary": "V",
    },
    # Mains
    {
        "menu_slug": "dinner",
        "name": "Breaded Butter Roasted Chicken",
        "description": "Sweetcorn puree, charred corn, potato and herb rosti, chicken jus",
        "price": 18.95,
        "category": "Mains",
        "ingredients": "chicken breast\nbreadcrumbs\nbutter\negg\nsweetcorn\npotato\nherbs\ngarlic\nchicken stock\nflour",
    },
    {
        "menu_slug": "dinner",
        "name": "Pan-Seared Sea Bass",
        "description": "Crushed new potatoes, samphire, cherry tomatoes, caper and lemon butter",
        "price": 21.95,
        "category": "Mains",
        "ingredients": "sea bass fillet\nnew potatoes\nsamphire\ncherry tomatoes\ncapers\nlemon\nbutter\nwhite wine",
    },
    {
        "menu_slug": "dinner",
        "name": "8oz Sirloin Steak",
        "description": "Triple-cooked chips, vine tomatoes, field mushroom, peppercorn sauce",
        "price": 28.95,
        "category": "Mains",
        "ingredients": "sirloin steak\npotatoes\nvine tomatoes\nmushroom\ncream\npeppercorns\nbrandy\nbeef stock\nbutter",
    },
    {
        "menu_slug": "dinner",
        "name": "Sausage Trio",
        "description": "Toulouse, Cumberland and Pork & leek with creamed potato, red wine gravy",
        "price": 16.50,
        "category": "Mains",
        "ingredients": "pork sausage\npotato\ncream\nbutter\nonion\nred wine\nbeef stock\nflour",
    },
    {
        "menu_slug": "dinner",
        "name": "Wild Mushroom Risotto",
        "description": "Truffle oil, parmesan crisp, rocket, aged balsamic",
        "price": 15.50,
        "category": "Mains",
        "ingredients": "arborio rice\nwild mushrooms\nonion\ngarlic\nwhite wine\nparmesan\ntruffle oil\nbalsamic vinegar\nbutter",
        "dietary": "V",
    },
    {
        "menu_slug": "dinner",
        "name": "Beer Battered Fish & Chips",
        "description": "Mushy peas, tartare sauce, lemon",
        "price": 16.95,
        "category": "Mains",
        "ingredients": "cod fillet\nbeer\nflour\negg\npotatoes\npeas\nmayonnaise\ncapers\nlemon",
    },
    {
        "menu_slug": "dinner",
        "name": "Curious Kitchen Burger",
        "description": "Smoked bacon, cheddar, brioche bun, house relish, skinny fries",
        "price": 16.95,
        "category": "Mains",
        "ingredients": "beef patty\nsmoked bacon\ncheddar\nbrioche bun\nlettuce\ntomato\nmayonnaise\nsesame seeds",
    },
    # Desserts
    {
        "menu_slug": "dinner",
        "name": "Sticky Toffee Pudding",
        "description": "Butterscotch sauce, vanilla ice cream",
        "price": 8.50,
        "category": "Desserts",
        "ingredients": "dates\nflour\neggs\nbutter\nsugar\ncream\nmilk",
    },
    {
        "menu_slug": "dinner",
        "name": "Chocolate Fondant",
        "description": "Salted caramel ice cream, honeycomb",
        "price": 9.50,
        "category": "Desserts",
        "ingredients": "dark chocolate\nbutter\neggs\nflour\ncream",
    },
    {
        "menu_slug": "dinner",
        "name": "Lemon Posset",
        "description": "Raspberry sorbet, shortbread crumble, fresh berries",
        "price": 8.50,
        "category": "Desserts",
        "ingredients": "cream\nsugar\nlemon\nraspberries\nflour\nbutter",
    },
    # Sides
    {
        "menu_slug": "dinner",
        "name": "Triple-Cooked Chips",
        "description": "",
        "price": 4.50,
        "category": "Sides",
        "ingredients": "potatoes\nvegetable oil\nsalt",
        "dietary": "V,VG,GF",
    },
    {
        "menu_slug": "dinner",
        "name": "Seasonal Vegetables",
        "description": "Buttered seasonal greens",
        "price": 4.50,
        "category": "Sides",
        "ingredients": "seasonal vegetables\nbutter",
        "dietary": "V,VG,GF",
    },
    {
        "menu_slug": "dinner",
        "name": "House Salad",
        "description": "Mixed leaves, cherry tomatoes, balsamic dressing",
        "price": 4.00,
        "category": "Sides",
        "ingredients": "mixed leaves\ncherry tomatoes\nbalsamic vinegar\nolive oil",
        "dietary": "V,VG,GF",
    },
    {
        "menu_slug": "dinner",
        "name": "Artisan Bread",
        "description": "Spanish olive oil and aged balsamic",
        "price": 3.25,
        "category": "Sides",
        "ingredients": "bread flour\nyeast\nolive oil\nbalsamic vinegar",
        "dietary": "V,VG",
    },

    # ──────────────────────────────────────────────
    # BAR & LOUNGE
    # ──────────────────────────────────────────────
    # Nibbles
    {
        "menu_slug": "bar-lounge",
        "name": "Honey Roast Cashews",
        "description": "Warm spiced nuts",
        "price": 4.00,
        "category": "Nibbles",
        "ingredients": "cashew nuts\nhoney",
        "dietary": "V,VG,GF",
    },
    {
        "menu_slug": "bar-lounge",
        "name": "Marinated Olives",
        "description": "Mixed olives with herbs and chilli",
        "price": 4.00,
        "category": "Nibbles",
        "ingredients": "olives\nolive oil\nchilli\ngarlic\nherbs",
        "dietary": "V,VG,GF",
    },
    {
        "menu_slug": "bar-lounge",
        "name": "Yorkshire Chorizo Board",
        "description": "Paganum chorizo, tomato, basil",
        "price": 6.00,
        "category": "Nibbles",
        "ingredients": "chorizo\ntomato\nbasil\nbread",
    },
    {
        "menu_slug": "bar-lounge",
        "name": "Salt & Pepper Squid",
        "description": "Five-spiced with chipotle mayo",
        "price": 6.00,
        "category": "Nibbles",
        "ingredients": "squid\nflour\negg\nfive spice\nmayonnaise\nchipotle",
    },
    # Light Bites
    {
        "menu_slug": "bar-lounge",
        "name": "Smoked Haddock Fishcake",
        "description": "Charred lemon, chive beurre blanc, tempura prawns",
        "price": 9.50,
        "category": "Light Bites",
        "ingredients": "smoked haddock\npotato\negg\nflour\nbreadcrumbs\nlemon\nbutter\nchives\nprawns",
    },
    {
        "menu_slug": "bar-lounge",
        "name": "Soup of the Day",
        "description": "With dipping bread",
        "price": 7.50,
        "category": "Light Bites",
        "ingredients": "seasonal vegetables\nvegetable stock\ncream\nbread",
    },
    {
        "menu_slug": "bar-lounge",
        "name": "Beans on Toast",
        "description": "With mature cheddar cheese",
        "price": 8.00,
        "category": "Light Bites",
        "ingredients": "baked beans\nbread\ncheddar",
    },
    {
        "menu_slug": "bar-lounge",
        "name": "Club Sandwich",
        "description": "Chicken, bacon, lettuce, tomato, mayo, fries",
        "price": 12.50,
        "category": "Light Bites",
        "ingredients": "bread\nchicken\nbacon\nlettuce\ntomato\nmayonnaise\npotatoes",
    },
    {
        "menu_slug": "bar-lounge",
        "name": "Halloumi & Avocado Wrap",
        "description": "Roasted peppers, rocket, sweet chilli",
        "price": 11.50,
        "category": "Light Bites",
        "ingredients": "halloumi\navocado\ntortilla wrap\nroasted peppers\nrocket\nsweet chilli sauce",
        "dietary": "V",
    },
    {
        "menu_slug": "bar-lounge",
        "name": "Steak Sandwich",
        "description": "Ciabatta, caramelised onion, rocket, peppercorn sauce, fries",
        "price": 14.50,
        "category": "Light Bites",
        "ingredients": "sirloin steak\nciabatta bread\nonion\nrocket\ncream\npeppercorns\npotatoes",
    },

    # ──────────────────────────────────────────────
    # AFTERNOON TEA
    # ──────────────────────────────────────────────
    # Sandwiches
    {
        "menu_slug": "afternoon-tea",
        "name": "Smoked Salmon & Cream Cheese",
        "description": "On white bread",
        "price": 0,
        "category": "Sandwiches",
        "ingredients": "smoked salmon\ncream cheese\nbread\nlemon",
    },
    {
        "menu_slug": "afternoon-tea",
        "name": "Egg Mayonnaise & Cress",
        "description": "On wholemeal bread",
        "price": 0,
        "category": "Sandwiches",
        "ingredients": "egg\nmayonnaise\ncress\nbread",
        "dietary": "V",
    },
    {
        "menu_slug": "afternoon-tea",
        "name": "Honey Roast Ham & Mustard",
        "description": "On white bread",
        "price": 0,
        "category": "Sandwiches",
        "ingredients": "ham\nmustard\nbread",
    },
    {
        "menu_slug": "afternoon-tea",
        "name": "Cucumber & Mint Cream Cheese",
        "description": "On white bread",
        "price": 0,
        "category": "Sandwiches",
        "ingredients": "cucumber\ncream cheese\nmint\nbread",
        "dietary": "V",
    },
    # Scones
    {
        "menu_slug": "afternoon-tea",
        "name": "Plain Scone",
        "description": "With clotted cream and strawberry preserve",
        "price": 0,
        "category": "Scones",
        "ingredients": "flour\nbutter\nmilk\negg\nclotted cream\nstrawberry jam",
    },
    {
        "menu_slug": "afternoon-tea",
        "name": "Fruit Scone",
        "description": "With clotted cream and strawberry preserve",
        "price": 0,
        "category": "Scones",
        "ingredients": "flour\nbutter\nmilk\negg\nsultanas\nclotted cream\nstrawberry jam",
    },
    # Sweet Treats
    {
        "menu_slug": "afternoon-tea",
        "name": "Victoria Sponge",
        "description": "Classic vanilla sponge with jam and cream",
        "price": 0,
        "category": "Sweet Treats",
        "ingredients": "flour\neggs\nbutter\nsugar\ncream\nstrawberry jam",
    },
    {
        "menu_slug": "afternoon-tea",
        "name": "Chocolate Eclair",
        "description": "Dark chocolate with chantilly cream",
        "price": 0,
        "category": "Sweet Treats",
        "ingredients": "flour\nbutter\neggs\ndark chocolate\ncream",
    },
    {
        "menu_slug": "afternoon-tea",
        "name": "Lemon Tart",
        "description": "With raspberry coulis",
        "price": 0,
        "category": "Sweet Treats",
        "ingredients": "flour\nbutter\neggs\nlemon\nsugar\ncream\nraspberries",
    },
    {
        "menu_slug": "afternoon-tea",
        "name": "Macaron",
        "description": "Chef's selection",
        "price": 0,
        "category": "Sweet Treats",
        "ingredients": "almond flour\negg whites\nsugar",
    },

    # ──────────────────────────────────────────────
    # SUNDAY LUNCH
    # ──────────────────────────────────────────────
    # Starters
    {
        "menu_slug": "sunday-lunch",
        "name": "Yorkshire Pudding & Gravy",
        "description": "Giant Yorkshire with rich onion gravy",
        "price": 6.50,
        "category": "Starters",
        "ingredients": "flour\neggs\nmilk\nonion\nbeef stock\nbutter",
    },
    {
        "menu_slug": "sunday-lunch",
        "name": "Prawn Cocktail",
        "description": "Classic Marie Rose sauce, baby gem, lemon",
        "price": 8.50,
        "category": "Starters",
        "ingredients": "prawns\nmayonnaise\ntomato ketchup\nlemon\nlettuce",
    },
    # Mains
    {
        "menu_slug": "sunday-lunch",
        "name": "Roast Sirloin of Beef",
        "description": "Yorkshire pudding, roast potatoes, seasonal veg, gravy",
        "price": 18.95,
        "category": "Mains",
        "ingredients": "sirloin beef\nflour\neggs\nmilk\npotatoes\nseasonal vegetables\nbeef stock\nbutter",
    },
    {
        "menu_slug": "sunday-lunch",
        "name": "Roast Chicken Supreme",
        "description": "Yorkshire pudding, roast potatoes, seasonal veg, gravy",
        "price": 16.95,
        "category": "Mains",
        "ingredients": "chicken\nflour\neggs\nmilk\npotatoes\nseasonal vegetables\nchicken stock\nbutter",
    },
    {
        "menu_slug": "sunday-lunch",
        "name": "Roast Pork Loin",
        "description": "Crackling, apple sauce, roast potatoes, seasonal veg",
        "price": 17.50,
        "category": "Mains",
        "ingredients": "pork loin\npotatoes\napple\nseasonal vegetables\nflour\ngravy",
    },
    {
        "menu_slug": "sunday-lunch",
        "name": "Nut Roast",
        "description": "Mixed nut roast, roast potatoes, seasonal veg, vegetarian gravy",
        "price": 14.95,
        "category": "Mains",
        "ingredients": "cashew nuts\nwalnuts\nbreadcrumbs\nonion\nherbs\negg\npotatoes\nseasonal vegetables",
        "dietary": "V",
    },
    # Desserts
    {
        "menu_slug": "sunday-lunch",
        "name": "Apple Crumble",
        "description": "With custard",
        "price": 8.00,
        "category": "Desserts",
        "ingredients": "apples\nflour\nbutter\nsugar\nmilk\neggs\ncustard powder",
    },
    {
        "menu_slug": "sunday-lunch",
        "name": "Sticky Toffee Pudding",
        "description": "Butterscotch sauce, vanilla ice cream",
        "price": 8.50,
        "category": "Desserts",
        "ingredients": "dates\nflour\neggs\nbutter\nsugar\ncream\nmilk",
    },

    # ──────────────────────────────────────────────
    # DRINKS
    # ──────────────────────────────────────────────
    # Wine
    {
        "menu_slug": "drinks",
        "name": "House White - Pinot Grigio",
        "description": "Italy, crisp and refreshing",
        "price": 6.50,
        "category": "Wine",
        "ingredients": "white wine",
    },
    {
        "menu_slug": "drinks",
        "name": "House Red - Merlot",
        "description": "Chile, smooth and fruity",
        "price": 6.50,
        "category": "Wine",
        "ingredients": "red wine",
    },
    {
        "menu_slug": "drinks",
        "name": "Sauvignon Blanc",
        "description": "Marlborough, New Zealand",
        "price": 7.50,
        "category": "Wine",
        "ingredients": "white wine",
    },
    {
        "menu_slug": "drinks",
        "name": "Sancerre",
        "description": "Loire Valley, France",
        "price": 10.50,
        "category": "Wine",
        "ingredients": "white wine",
    },
    {
        "menu_slug": "drinks",
        "name": "Malbec",
        "description": "Mendoza, Argentina",
        "price": 7.50,
        "category": "Wine",
        "ingredients": "red wine",
    },
    {
        "menu_slug": "drinks",
        "name": "Rioja Reserva",
        "description": "Spain, oak-aged",
        "price": 9.00,
        "category": "Wine",
        "ingredients": "red wine",
    },
    {
        "menu_slug": "drinks",
        "name": "Prosecco",
        "description": "Italy, 125ml glass",
        "price": 7.00,
        "category": "Wine",
        "ingredients": "white wine",
    },
    {
        "menu_slug": "drinks",
        "name": "Nyetimber Classic Cuv\u00e9e",
        "description": "English sparkling wine, glass",
        "price": 14.00,
        "category": "Wine",
        "ingredients": "white wine",
    },
    # Beer
    {
        "menu_slug": "drinks",
        "name": "Thwaites Original",
        "description": "Cask ale, pint",
        "price": 5.20,
        "category": "Beer",
        "ingredients": "beer",
    },
    {
        "menu_slug": "drinks",
        "name": "Birra Moretti",
        "description": "Italian lager, pint",
        "price": 5.80,
        "category": "Beer",
        "ingredients": "beer",
    },
    {
        "menu_slug": "drinks",
        "name": "Peroni Nastro Azzurro",
        "description": "Italian lager, 330ml bottle",
        "price": 5.80,
        "category": "Beer",
        "ingredients": "beer",
    },
    {
        "menu_slug": "drinks",
        "name": "BrewDog Punk IPA",
        "description": "Craft IPA, 330ml can",
        "price": 5.50,
        "category": "Beer",
        "ingredients": "beer",
    },
    {
        "menu_slug": "drinks",
        "name": "Guinness",
        "description": "Draught stout, pint",
        "price": 5.80,
        "category": "Beer",
        "ingredients": "beer",
    },
    # Cocktails
    {
        "menu_slug": "drinks",
        "name": "Espresso Martini",
        "description": "Vodka, Kahl\u00faa, fresh espresso",
        "price": 10.50,
        "category": "Cocktails",
        "ingredients": "vodka\ncoffee liqueur\ncoffee",
    },
    {
        "menu_slug": "drinks",
        "name": "Aperol Spritz",
        "description": "Aperol, prosecco, soda",
        "price": 9.50,
        "category": "Cocktails",
        "ingredients": "aperol\nprosecco\nsoda",
    },
    {
        "menu_slug": "drinks",
        "name": "Classic Mojito",
        "description": "Rum, lime, mint, sugar, soda",
        "price": 9.50,
        "category": "Cocktails",
        "ingredients": "rum\nlime\nmint\nsugar",
    },
    {
        "menu_slug": "drinks",
        "name": "Pornstar Martini",
        "description": "Vodka, passion fruit, vanilla, prosecco shot",
        "price": 10.50,
        "category": "Cocktails",
        "ingredients": "vodka\npassion fruit\nvanilla\nprosecco",
    },
    {
        "menu_slug": "drinks",
        "name": "Old Fashioned",
        "description": "Bourbon, bitters, orange, sugar",
        "price": 10.00,
        "category": "Cocktails",
        "ingredients": "bourbon\nbitters\norange",
    },
    {
        "menu_slug": "drinks",
        "name": "Gin & Tonic",
        "description": "Hendrick's gin, Fever-Tree tonic",
        "price": 8.50,
        "category": "Cocktails",
        "ingredients": "gin\ntonic water\ncucumber",
    },
    {
        "menu_slug": "drinks",
        "name": "Negroni",
        "description": "Gin, Campari, sweet vermouth",
        "price": 10.00,
        "category": "Cocktails",
        "ingredients": "gin\ncampari\nvermouth",
    },
    # Soft Drinks
    {
        "menu_slug": "drinks",
        "name": "Coca-Cola",
        "description": "330ml bottle",
        "price": 3.20,
        "category": "Soft Drinks",
        "ingredients": "",
    },
    {
        "menu_slug": "drinks",
        "name": "Diet Coke",
        "description": "330ml bottle",
        "price": 3.20,
        "category": "Soft Drinks",
        "ingredients": "",
    },
    {
        "menu_slug": "drinks",
        "name": "Lemonade",
        "description": "Homemade",
        "price": 3.00,
        "category": "Soft Drinks",
        "ingredients": "",
    },
    {
        "menu_slug": "drinks",
        "name": "Fresh Orange Juice",
        "description": "Freshly squeezed",
        "price": 3.50,
        "category": "Soft Drinks",
        "ingredients": "",
    },
    {
        "menu_slug": "drinks",
        "name": "Sparkling Water",
        "description": "Harrogate, 330ml",
        "price": 2.80,
        "category": "Soft Drinks",
        "ingredients": "",
    },
    {
        "menu_slug": "drinks",
        "name": "Still Water",
        "description": "Harrogate, 330ml",
        "price": 2.80,
        "category": "Soft Drinks",
        "ingredients": "",
    },
    # Hot Drinks
    {
        "menu_slug": "drinks",
        "name": "Americano",
        "description": "",
        "price": 3.20,
        "category": "Hot Drinks",
        "ingredients": "",
    },
    {
        "menu_slug": "drinks",
        "name": "Cappuccino",
        "description": "",
        "price": 3.50,
        "category": "Hot Drinks",
        "ingredients": "milk",
    },
    {
        "menu_slug": "drinks",
        "name": "Latte",
        "description": "",
        "price": 3.50,
        "category": "Hot Drinks",
        "ingredients": "milk",
    },
    {
        "menu_slug": "drinks",
        "name": "Flat White",
        "description": "",
        "price": 3.50,
        "category": "Hot Drinks",
        "ingredients": "milk",
    },
    {
        "menu_slug": "drinks",
        "name": "Pot of Tea",
        "description": "Yorkshire Tea",
        "price": 3.00,
        "category": "Hot Drinks",
        "ingredients": "",
    },
    {
        "menu_slug": "drinks",
        "name": "Hot Chocolate",
        "description": "With cream and marshmallows",
        "price": 3.80,
        "category": "Hot Drinks",
        "ingredients": "milk\ncream",
    },
]


def seed_dishes():
    """Seed sample dishes if the menu is empty."""
    if MenuItem.query.first():
        return  # Already has dishes, skip

    # Build slug -> Menu lookup
    menus = {m.slug: m for m in Menu.query.all()}

    for dish_data in SAMPLE_DISHES:
        menu = menus.get(dish_data.get("menu_slug"))
        menu_id = menu.id if menu else None

        dish = MenuItem(
            name=dish_data["name"],
            description=dish_data["description"],
            price=dish_data["price"],
            category=dish_data.get("category", "Mains"),
            menu_id=menu_id,
            active=True,
            dietary_labels=dish_data.get("dietary", ""),
        )
        db.session.add(dish)
        db.session.flush()

        # Add ingredients
        ingredients_text = dish_data.get("ingredients", "")
        if ingredients_text.strip():
            for line in ingredients_text.strip().split("\n"):
                line = line.strip()
                if line:
                    ing = Ingredient(menu_item_id=dish.id, raw_text=line, parsed_name=line)
                    db.session.add(ing)

            # Detect allergens
            detection = parse_and_detect(ingredients_text)
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
    seed_pairings()


SEED_PAIRINGS = [
    # Steak pairings
    {"food": "8oz Sirloin Steak", "drink": "Malbec", "note": "Bold red to match the steak"},
    {"food": "8oz Sirloin Steak", "drink": "Rioja Reserva", "note": "Oak-aged complexity"},
    # Sea bass
    {"food": "Pan-Seared Sea Bass", "drink": "Sancerre", "note": "Crisp white, perfect with fish"},
    {"food": "Pan-Seared Sea Bass", "drink": "Sauvignon Blanc", "note": "Light and refreshing"},
    # Chicken
    {"food": "Breaded Butter Roasted Chicken", "drink": "House White - Pinot Grigio", "note": "Light and crisp"},
    {"food": "Breaded Butter Roasted Chicken", "drink": "Thwaites Original", "note": "Local Yorkshire ale"},
    # Burger
    {"food": "Curious Kitchen Burger", "drink": "BrewDog Punk IPA", "note": "Hoppy kick with the burger"},
    {"food": "Curious Kitchen Burger", "drink": "Birra Moretti", "note": "Classic lager pairing"},
    # Fish & chips
    {"food": "Beer Battered Fish & Chips", "drink": "Thwaites Original", "note": "Ale and fish, a British classic"},
    {"food": "Beer Battered Fish & Chips", "drink": "Sauvignon Blanc", "note": "Cuts through the batter"},
    # Risotto
    {"food": "Wild Mushroom Risotto", "drink": "House White - Pinot Grigio", "note": "Earthy match"},
    {"food": "Wild Mushroom Risotto", "drink": "Sancerre", "note": "Elegant pairing"},
    # Sausage trio
    {"food": "Sausage Trio", "drink": "Malbec", "note": "Rich and hearty"},
    {"food": "Sausage Trio", "drink": "Thwaites Original", "note": "Traditional pub match"},
    # Sunday roasts
    {"food": "Roast Sirloin of Beef", "drink": "Rioja Reserva", "note": "Sunday classic"},
    {"food": "Roast Sirloin of Beef", "drink": "Malbec", "note": "Bold and beefy"},
    {"food": "Roast Chicken Supreme", "drink": "Sauvignon Blanc", "note": "Fresh and light"},
    {"food": "Roast Pork Loin", "drink": "House Red - Merlot", "note": "Smooth and fruity"},
    # Parfait
    {"food": "Whipped Chicken Liver Parfait", "drink": "Sancerre", "note": "Classic French pairing"},
    # Prawns
    {"food": "Chilled Prawns & Crayfish Tails", "drink": "Prosecco", "note": "Bubbles with seafood"},
    {"food": "Chilled Prawns & Crayfish Tails", "drink": "Sauvignon Blanc", "note": "Zesty and fresh"},
    # Bar items
    {"food": "Steak Sandwich", "drink": "Malbec", "note": "Steak deserves a bold red"},
    {"food": "Steak Sandwich", "drink": "BrewDog Punk IPA", "note": "Hoppy and satisfying"},
    {"food": "Club Sandwich", "drink": "Birra Moretti", "note": "Light lager, easy match"},
    {"food": "Salt & Pepper Squid", "drink": "Prosecco", "note": "Bubbles cut through the spice"},
    {"food": "Smoked Haddock Fishcake", "drink": "Sauvignon Blanc", "note": "Fresh with the fish"},
    # Dessert pairings
    {"food": "Chocolate Fondant", "drink": "Espresso Martini", "note": "Coffee and chocolate heaven"},
    {"food": "Sticky Toffee Pudding", "drink": "Old Fashioned", "note": "Rich on rich"},
    {"food": "Lemon Posset", "drink": "Prosecco", "note": "Light and citrusy"},
]


def seed_pairings():
    """Seed drink pairings if the pairing table is empty."""
    if Pairing.query.first():
        return  # Already has pairings, skip

    for pair_data in SEED_PAIRINGS:
        food_item = MenuItem.query.filter_by(name=pair_data["food"]).first()
        drink_item = MenuItem.query.filter_by(name=pair_data["drink"]).first()
        if food_item and drink_item:
            p = Pairing(
                food_item_id=food_item.id,
                drink_item_id=drink_item.id,
                note=pair_data["note"],
            )
            db.session.add(p)

    db.session.commit()

"""Seed the database with sample Curious Kitchen menu dishes."""
from models import db, MenuItem, Ingredient, Allergen, MenuItemAllergen
from parser import parse_and_detect


SAMPLE_DISHES = [
    {
        "name": "Heritage Beetroot Textures",
        "description": "Black garlic yogurt, pickled red onion, toasted sunflower seeds, goats cheese pearls",
        "price": 8.95,
        "ingredients": "heritage beetroot\nblack garlic\nyogurt\nred onion\nvinegar\nsunflower seeds\ngoats cheese",
    },
    {
        "name": "Chilled Prawns & Crayfish Tails",
        "description": "Avocado mousse, bloody Mary dressing, lemon gel, pickled samphire",
        "price": 10.50,
        "ingredients": "prawns\ncrayfish tails\navocado\ntomato juice\nhorseradish\nWorcestershire sauce\nlemon\nsamphire\ncelery salt",
    },
    {
        "name": "Artisan Bread",
        "description": "Spanish olive oil and aged balsamic",
        "price": 3.25,
        "ingredients": "bread flour\nyeast\nolive oil\nbalsamic vinegar\nsalt",
    },
    {
        "name": "Soup of the Day",
        "description": "Freshly made with artisan bread roll and butter",
        "price": 7.50,
        "ingredients": "seasonal vegetables\nvegetable stock\nbutter\nbread roll\ncream",
    },
    {
        "name": "Breaded Butter Roasted Chicken",
        "description": "Sweetcorn puree, charred corn, potato and herb rosti, chicken jus, garlic and parsley oil",
        "price": 18.95,
        "ingredients": "chicken breast\nbreadcrumbs\nbutter\negg\nsweetcorn\npotato\nfresh herbs\ngarlic\nparsley\nchicken stock\nflour",
    },
    {
        "name": "Sausage Trio",
        "description": "Toulouse, Cumberland and Pork & leek sausages with creamed potato, caramelised onion, red wine gravy",
        "price": 16.50,
        "ingredients": "Toulouse sausage\nCumberland sausage\npork and leek sausage\npotato\ncream\nbutter\nonion\nred wine\nbeef stock\nflour",
    },
    {
        "name": "Pan-Seared Sea Bass",
        "description": "Crushed new potatoes, samphire, cherry tomatoes, caper and lemon butter sauce",
        "price": 21.95,
        "ingredients": "sea bass fillet\nnew potatoes\nsamphire\ncherry tomatoes\ncapers\nlemon\nbutter\nwhite wine\nolive oil",
    },
    {
        "name": "8oz Sirloin Steak",
        "description": "Triple-cooked chips, roasted vine tomatoes, field mushroom, peppercorn sauce",
        "price": 28.95,
        "ingredients": "sirloin steak\npotatoes\nvegetable oil\nvine tomatoes\nfield mushroom\ncream\ngreen peppercorns\nbrandy\nbeef stock\nbutter",
    },
    {
        "name": "Wild Mushroom Risotto",
        "description": "Truffle oil, parmesan crisp, rocket and aged balsamic",
        "price": 15.50,
        "ingredients": "arborio rice\nwild mushrooms\nonion\ngarlic\nwhite wine\nvegetable stock\nparmesan\ntruffle oil\nrocket\nbalsamic vinegar\nbutter",
    },
    {
        "name": "Beer Battered Fish & Chips",
        "description": "Mushy peas, tartare sauce, lemon, triple-cooked chips",
        "price": 16.95,
        "ingredients": "cod fillet\nbeer\nflour\negg\npotatoes\ngarden peas\nmayonnaise\ncapers\ngherkins\nlemon",
    },
    {
        "name": "Curious Kitchen Burger",
        "description": "Smoked bacon, cheddar, brioche bun, baby gem, tomato, red onion, house relish, skinny fries",
        "price": 16.95,
        "ingredients": "beef patty\nsmoked bacon\ncheddar\nbrioche bun\nbaby gem lettuce\ntomato\nred onion\ntomato relish\npotatoes\nmayonnaise\nsesame seeds",
    },
    {
        "name": "Sticky Toffee Pudding",
        "description": "Butterscotch sauce, vanilla ice cream",
        "price": 8.50,
        "ingredients": "dates\nflour\neggs\nbutter\ndemerara sugar\nvanilla\ncream\nmilk",
    },
    {
        "name": "Chocolate Fondant",
        "description": "Salted caramel ice cream, honeycomb",
        "price": 9.50,
        "ingredients": "dark chocolate\nbutter\neggs\nsugar\nflour\nsalt\ncream\ncaramel\nhoneycomb",
    },
    {
        "name": "Lemon Posset",
        "description": "Raspberry sorbet, shortbread crumble, fresh berries",
        "price": 8.50,
        "ingredients": "cream\nsugar\nlemon\nraspberries\nflour\nbutter\nblueberries",
    },
]


def seed_dishes():
    """Seed sample dishes if the menu is empty."""
    if MenuItem.query.first():
        return  # Already has dishes, skip

    for dish_data in SAMPLE_DISHES:
        dish = MenuItem(
            name=dish_data["name"],
            description=dish_data["description"],
            price=dish_data["price"],
            active=True,
        )
        db.session.add(dish)
        db.session.flush()

        # Add ingredients
        for line in dish_data["ingredients"].strip().split("\n"):
            line = line.strip()
            if line:
                ing = Ingredient(menu_item_id=dish.id, raw_text=line, parsed_name=line)
                db.session.add(ing)

        # Detect allergens
        detection = parse_and_detect(dish_data["ingredients"])
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

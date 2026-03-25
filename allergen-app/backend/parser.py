import re
import json
import logging

from allergen_map import ALLERGEN_MAP

logger = logging.getLogger(__name__)

# Regex to strip quantities and filler words
QUANTITY_PATTERN = re.compile(
    r"\b\d+[\d./]*\s*"
    r"(g|kg|ml|l|tsp|tbsp|cup|cups|oz|lb|lbs|"
    r"handful|handfuls|pinch|pinches|clove|cloves|sprig|sprigs)\b",
    re.IGNORECASE,
)
FILLER_WORDS = re.compile(
    r"\b(of|a|an|the|fresh|dried|chopped|diced|sliced|minced|grated|"
    r"ground|crushed|finely|roughly|large|small|medium|thin|thick|"
    r"boneless|skinless|raw|cooked|frozen|tinned|canned|organic)\b",
    re.IGNORECASE,
)
NUMBER_PATTERN = re.compile(r"\b\d+[\d./]*\b")


def clean_ingredient(raw: str) -> str:
    """Strip quantities, units, and filler words from an ingredient string."""
    text = QUANTITY_PATTERN.sub("", raw)
    text = NUMBER_PATTERN.sub("", text)
    text = FILLER_WORDS.sub("", text)
    text = re.sub(r"\s+", " ", text).strip().strip(",").strip("-").strip()
    return text.lower()


def keyword_match(ingredient: str) -> list[str]:
    """Match a cleaned ingredient against the allergen map."""
    ingredient_lower = ingredient.lower().strip()
    allergens: set[str] = set()

    # Try exact match first
    if ingredient_lower in ALLERGEN_MAP:
        allergens.update(ALLERGEN_MAP[ingredient_lower])

    # Try substring matching for multi-word keys and ingredient phrases
    for keyword, allergen_list in ALLERGEN_MAP.items():
        if keyword in ingredient_lower or ingredient_lower in keyword:
            allergens.update(allergen_list)

    return list(allergens)


def ai_detect(ingredient: str, api_key: str) -> tuple[list[str], bool]:
    """Use Claude API to detect allergens for an unmatched ingredient.
    Returns (allergen_list, success)."""
    if not api_key:
        return [], False

    try:
        import anthropic

        client = anthropic.Anthropic(api_key=api_key)
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=200,
            messages=[
                {
                    "role": "user",
                    "content": (
                        f"You are a UK food allergen expert. Given this ingredient: '{ingredient}', "
                        f"which of the 14 UK legal allergens might it contain? "
                        f"The 14 allergens are: Celery, Gluten, Crustaceans, Eggs, Fish, Lupin, "
                        f"Milk, Molluscs, Mustard, Peanuts, Sesame, Soybeans, Sulphites, Tree Nuts. "
                        f'Reply ONLY with a valid JSON array of allergen names, e.g. ["Milk", "Gluten"]. '
                        f"If none, return []."
                    ),
                }
            ],
        )
        result_text = message.content[0].text.strip()
        allergens = json.loads(result_text)
        if isinstance(allergens, list):
            valid = {
                "Celery", "Gluten", "Crustaceans", "Eggs", "Fish", "Lupin",
                "Milk", "Molluscs", "Mustard", "Peanuts", "Sesame",
                "Soybeans", "Sulphites", "Tree Nuts",
            }
            return [a for a in allergens if a in valid], True
    except Exception as e:
        logger.warning("AI allergen detection failed for '%s': %s", ingredient, e)

    return [], False


def parse_and_detect(ingredients_text: str, api_key: str = "") -> dict:
    """Parse ingredients and detect allergens.
    Returns {allergens: [...], ai_used: bool, ai_warnings: [...]}"""
    lines = [line.strip() for line in ingredients_text.strip().split("\n") if line.strip()]
    all_allergens: set[str] = set()
    ai_used = False
    ai_warnings: list[str] = []

    for raw_line in lines:
        cleaned = clean_ingredient(raw_line)
        if not cleaned:
            continue

        matched = keyword_match(cleaned)
        if matched:
            all_allergens.update(matched)
        else:
            # AI fallback
            ai_result, success = ai_detect(cleaned, api_key)
            if success and ai_result:
                all_allergens.update(ai_result)
                ai_used = True
            elif not success and api_key:
                ai_warnings.append(f"AI detection failed for: {raw_line}")

    return {
        "allergens": sorted(all_allergens),
        "ai_used": ai_used,
        "ai_warnings": ai_warnings,
    }

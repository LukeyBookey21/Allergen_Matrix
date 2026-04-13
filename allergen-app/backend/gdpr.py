import logging
from datetime import datetime, timedelta
from models import db, Order, OrderItem

logger = logging.getLogger(__name__)


def purge_old_orders(days=90):
    """Delete orders older than specified days. Returns count of deleted orders."""
    cutoff = datetime.now() - timedelta(days=days)
    old_orders = Order.query.filter(Order.created_at < cutoff).all()
    count = len(old_orders)
    for order in old_orders:
        db.session.delete(order)
    db.session.commit()
    logger.info("Purged %d orders older than %d days", count, days)
    return count


def anonymize_order(order_id):
    """Anonymize a specific order (GDPR right to erasure)."""
    order = Order.query.get(order_id)
    if not order:
        return False
    order.customer_name = ""
    order.customer_email = ""
    order.notes = ""
    db.session.commit()
    return True

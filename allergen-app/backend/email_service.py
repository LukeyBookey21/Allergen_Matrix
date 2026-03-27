import logging
import resend
from flask import current_app

logger = logging.getLogger(__name__)


def _send_email(to_email, subject, html_content):
    """Send an email via Resend. Fails silently with logging."""
    api_key = current_app.config.get("RESEND_API_KEY", "")
    from_email = current_app.config.get("FROM_EMAIL", "onboarding@resend.dev")

    if not api_key:
        logger.warning("Resend API key not set — email not sent to %s: %s", to_email, subject)
        return False

    try:
        resend.api_key = api_key
        r = resend.Emails.send({
            "from": from_email,
            "to": [to_email],
            "subject": subject,
            "html": html_content,
        })
        logger.info("Email sent to %s (id: %s)", to_email, r.get("id", "unknown"))
        return True
    except Exception as e:
        logger.error("Failed to send email to %s: %s", to_email, e)
        return False


def send_pre_order_confirmation(pre_order):
    """Send confirmation email to customer after pre-order."""
    restaurant = current_app.config.get("RESTAURANT_NAME", "Curious Kitchen")

    # Build guest summary HTML
    guests_html = ""
    total = 0.0
    for guest in pre_order.guests:
        courses_html = ""
        for item in guest.items:
            if item.skipped:
                courses_html += f'<tr><td style="padding:4px 8px;color:#94a3b8;font-style:italic;">{item.course.title()}</td><td style="padding:4px 8px;color:#94a3b8;">— None —</td></tr>'
            elif item.menu_item:
                import json
                customs = {}
                try:
                    customs = json.loads(item.customisations) if item.customisations else {}
                except:
                    pass
                custom_str = ", ".join(v for k, v in customs.items() if v and v != "None")
                price = item.menu_item.price
                total += price
                dish_text = item.menu_item.name
                if custom_str:
                    dish_text += f' <span style="color:#d97706;">({custom_str})</span>'
                courses_html += f'<tr><td style="padding:4px 8px;color:#64748b;text-transform:uppercase;font-size:11px;">{item.course.title()}</td><td style="padding:4px 8px;">{dish_text}</td></tr>'

        allergen_text = guest.allergen_names if guest.allergen_names else "No allergies noted"
        guests_html += f'''
        <div style="margin-bottom:16px;padding:16px;background:#f8fafc;border-radius:12px;">
            <h3 style="margin:0 0 8px;color:#1e293b;font-size:16px;">{guest.guest_name}</h3>
            <p style="margin:0 0 8px;font-size:12px;color:#ef4444;">⚠ {allergen_text}</p>
            <table style="width:100%;font-size:14px;">{courses_html}</table>
        </div>
        '''

    html = f'''
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;">
        <div style="background:#1e293b;padding:32px;text-align:center;border-radius:12px 12px 0 0;">
            <h1 style="color:#ffffff;margin:0;font-size:28px;font-family:Georgia,serif;">{restaurant}</h1>
            <p style="color:#94a3b8;margin:8px 0 0;font-size:14px;">Pre-Order Confirmation</p>
        </div>

        <div style="padding:32px;">
            <p style="font-size:16px;color:#334155;">Dear {pre_order.contact_name},</p>
            <p style="font-size:14px;color:#64748b;">Thank you for your pre-order. Here are your booking details:</p>

            <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:20px;margin:20px 0;">
                <table style="width:100%;font-size:14px;">
                    <tr><td style="padding:4px 0;color:#64748b;width:120px;">Reference:</td><td style="font-weight:bold;color:#d97706;font-size:18px;">{pre_order.reference}</td></tr>
                    <tr><td style="padding:4px 0;color:#64748b;">Date:</td><td style="color:#1e293b;">{pre_order.booking_date}</td></tr>
                    <tr><td style="padding:4px 0;color:#64748b;">Time:</td><td style="color:#1e293b;">{pre_order.booking_time}</td></tr>
                    <tr><td style="padding:4px 0;color:#64748b;">Party size:</td><td style="color:#1e293b;">{pre_order.party_size} guests</td></tr>
                    <tr><td style="padding:4px 0;color:#64748b;">Estimated total:</td><td style="font-weight:bold;color:#1e293b;">£{total:.2f}</td></tr>
                </table>
            </div>

            <h2 style="font-size:18px;color:#1e293b;margin:24px 0 12px;">Guest Orders</h2>
            {guests_html}

            <div style="background:#f1f5f9;border-radius:12px;padding:16px;margin:24px 0;font-size:13px;color:#64748b;">
                <p style="margin:0 0 4px;">• Free amendments up to 24 hours before your booking</p>
                <p style="margin:0 0 4px;">• Payment will be taken on the day</p>
                <p style="margin:0;">• Please inform us of any additional dietary requirements</p>
            </div>

            <p style="font-size:13px;color:#94a3b8;margin-top:32px;">If you need to make changes, please contact us directly quoting your reference number <strong>{pre_order.reference}</strong>.</p>
        </div>

        <div style="background:#f8fafc;padding:20px;text-align:center;border-radius:0 0 12px 12px;border-top:1px solid #e2e8f0;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">{restaurant}</p>
            <p style="margin:4px 0 0;font-size:11px;color:#cbd5e1;">This is an automated email. Please do not reply.</p>
        </div>
    </div>
    '''

    _send_email(
        pre_order.email,
        f"Pre-Order Confirmation — {pre_order.reference} — {restaurant}",
        html,
    )


def send_pre_order_admin_notification(pre_order):
    """Send notification to chef/admin about new pre-order."""
    admin_email = current_app.config.get("ADMIN_NOTIFICATION_EMAIL", "")
    restaurant = current_app.config.get("RESTAURANT_NAME", "Curious Kitchen")

    if not admin_email:
        return

    # Build summary
    from collections import Counter
    import json
    dish_counts = Counter()
    allergen_summary = set()
    total = 0.0

    for guest in pre_order.guests:
        if guest.allergen_names:
            for a in guest.allergen_names.split(","):
                if a.strip():
                    allergen_summary.add(a.strip())
        for item in guest.items:
            if not item.skipped and item.menu_item:
                customs = {}
                try:
                    customs = json.loads(item.customisations) if item.customisations else {}
                except:
                    pass
                custom_str = ", ".join(v for k, v in customs.items() if v and v != "None")
                label = item.menu_item.name
                if custom_str:
                    label += f" ({custom_str})"
                dish_counts[label] += 1
                total += item.menu_item.price

    summary_html = ""
    for dish, count in dish_counts.most_common():
        summary_html += f"<li><strong>{count}x</strong> {dish}</li>"

    allergen_html = ", ".join(sorted(allergen_summary)) if allergen_summary else "None reported"

    html = f'''
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;">
        <div style="background:#dc2626;padding:24px;text-align:center;border-radius:12px 12px 0 0;">
            <h1 style="color:#ffffff;margin:0;font-size:22px;">🔔 New Pre-Order Received</h1>
        </div>

        <div style="padding:24px;">
            <table style="width:100%;font-size:14px;margin-bottom:16px;">
                <tr><td style="padding:4px 0;color:#64748b;width:120px;">Reference:</td><td style="font-weight:bold;color:#dc2626;font-size:18px;">{pre_order.reference}</td></tr>
                <tr><td style="padding:4px 0;color:#64748b;">Contact:</td><td>{pre_order.contact_name} ({pre_order.email})</td></tr>
                <tr><td style="padding:4px 0;color:#64748b;">Date:</td><td style="font-weight:bold;">{pre_order.booking_date} at {pre_order.booking_time}</td></tr>
                <tr><td style="padding:4px 0;color:#64748b;">Party size:</td><td><strong>{pre_order.party_size} guests</strong></td></tr>
                <tr><td style="padding:4px 0;color:#64748b;">Total:</td><td style="font-weight:bold;">£{total:.2f}</td></tr>
            </table>

            <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px;margin:16px 0;">
                <p style="margin:0;font-size:13px;color:#dc2626;font-weight:bold;">⚠ Table Allergens: {allergen_html}</p>
            </div>

            <h3 style="font-size:16px;color:#1e293b;margin:20px 0 8px;">Kitchen Summary</h3>
            <ul style="font-size:14px;color:#334155;padding-left:20px;">{summary_html}</ul>

            {f'<p style="font-size:14px;color:#64748b;margin-top:16px;"><strong>Special occasion:</strong> {pre_order.special_notes}</p>' if pre_order.special_notes else ''}

            <p style="font-size:13px;color:#94a3b8;margin-top:24px;">Log in to the admin dashboard to view full details, download the kitchen sheet, and print place cards.</p>
        </div>
    </div>
    '''

    _send_email(
        admin_email,
        f"🔔 New Pre-Order: {pre_order.reference} — {pre_order.party_size} guests on {pre_order.booking_date}",
        html,
    )


def send_order_confirmation(order, order_items, total):
    """Send confirmation for a regular table order (if customer provided email via name field)."""
    # Regular orders don't collect email, so this is a no-op for now
    # Could be used if we add email field to orders in the future
    pass


def send_order_admin_notification(order, order_items, total):
    """Send notification to admin about a new regular order."""
    admin_email = current_app.config.get("ADMIN_NOTIFICATION_EMAIL", "")
    restaurant = current_app.config.get("RESTAURANT_NAME", "Curious Kitchen")

    if not admin_email:
        return

    items_html = ""
    for item in order_items:
        items_html += f"<li>{item['quantity']}x {item['name']} — £{(item['price'] * item['quantity']):.2f}</li>"

    html = f'''
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:500px;margin:0 auto;">
        <div style="background:#d97706;padding:16px;text-align:center;border-radius:12px 12px 0 0;">
            <h2 style="color:#ffffff;margin:0;">New Order — Table {order.table_number}</h2>
        </div>
        <div style="padding:20px;background:#fff;">
            <p style="font-size:14px;color:#64748b;">Order #{order.id}{f" — {order.customer_name}" if order.customer_name else ""}</p>
            <ul style="font-size:14px;color:#334155;padding-left:20px;">{items_html}</ul>
            <p style="font-size:16px;font-weight:bold;color:#1e293b;">Total: £{total:.2f}</p>
            {f'<p style="font-size:13px;color:#64748b;">Notes: {order.notes}</p>' if order.notes else ''}
        </div>
    </div>
    '''

    _send_email(
        admin_email,
        f"New Order #{order.id} — Table {order.table_number} — £{total:.2f}",
        html,
    )

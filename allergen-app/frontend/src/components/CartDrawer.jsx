import { useState } from "react";

export default function CartDrawer({ items, onUpdateQuantity, onRemoveItem, onUpdateNotes, onClose, onCheckout, isOpen, pairingsMap = {}, onAddToCart }) {
  const [tableNumber, setTableNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const subtotal = items.reduce((sum, item) => sum + Number(item.dish.price) * item.quantity, 0);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  async function handlePlaceOrder() {
    if (!tableNumber.trim()) return;
    setError("");
    setSubmitting(true);
    try {
      await onCheckout(tableNumber.trim(), customerName.trim(), customerEmail.trim(), orderNotes.trim());
      setTableNumber("");
      setCustomerName("");
      setCustomerEmail("");
      setOrderNotes("");
    } catch (err) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-md bg-white shadow-2xl transform transition-transform duration-300 ease-out flex flex-col ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
          <div>
            <h2 className="font-display text-xl font-bold text-slate-800">Your Order</h2>
            {totalItems > 0 && (
              <p className="text-xs text-slate-400 mt-0.5">{totalItems} {totalItems === 1 ? "item" : "items"}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-stone-100 transition-colors text-slate-400 hover:text-slate-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-6 text-center">
              <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mb-4">
                <span className="text-2xl">🍽️</span>
              </div>
              <p className="text-slate-500 font-medium mb-1">Your order is empty</p>
              <p className="text-slate-400 text-sm">Browse the menu to add items.</p>
            </div>
          ) : (
            <div className="px-6 py-4 space-y-3">
              {items.map((item) => (
                <div key={item.dish.id} className="bg-stone-50 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-slate-800 text-sm truncate">{item.dish.name}</h3>
                      <p className="text-amber-700 text-sm font-semibold mt-0.5">
                        {(Number(item.dish.price) * item.quantity).toFixed(2)}
                        {item.quantity > 1 && (
                          <span className="text-slate-400 font-normal text-xs ml-1">
                            ({Number(item.dish.price).toFixed(2)} each)
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Quantity controls */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onUpdateQuantity(item.dish.id, item.quantity - 1)}
                        aria-label={`Decrease quantity of ${item.dish.name}`}
                        className="w-7 h-7 rounded-full bg-white border border-stone-200 flex items-center justify-center text-slate-500 hover:bg-stone-100 transition-colors text-sm font-medium"
                      >
                        -
                      </button>
                      <span className="w-6 text-center text-sm font-semibold text-slate-700">{item.quantity}</span>
                      <button
                        onClick={() => onUpdateQuantity(item.dish.id, item.quantity + 1)}
                        aria-label={`Increase quantity of ${item.dish.name}`}
                        className="w-7 h-7 rounded-full bg-white border border-stone-200 flex items-center justify-center text-slate-500 hover:bg-stone-100 transition-colors text-sm font-medium"
                      >
                        +
                      </button>
                      <button
                        onClick={() => onRemoveItem(item.dish.id)}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors ml-1"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Item notes */}
                  <input
                    type="text"
                    placeholder="Special requests for this item..."
                    value={item.notes}
                    onChange={(e) => onUpdateNotes(item.dish.id, e.target.value)}
                    className="mt-2 w-full text-xs text-slate-500 placeholder-slate-300 bg-white border border-stone-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-400 focus:border-transparent"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Pairing suggestions */}
          {items.length > 0 && (() => {
            const suggestions = [];
            const cartDishIds = new Set(items.map(i => i.dish.id));
            for (const item of items) {
              const pairings = pairingsMap[item.dish.id] || [];
              for (const p of pairings) {
                const drink = p.drink;
                if (drink && !cartDishIds.has(drink.id) && !suggestions.find(s => s.drink.id === drink.id)) {
                  suggestions.push({ foodName: item.dish.name, drink, note: p.note });
                }
              }
            }
            if (suggestions.length === 0) return null;
            return (
              <div className="px-6 py-4 border-t border-stone-100 bg-amber-50/50">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <span>🍷</span> Pairs well with your order
                </p>
                <div className="space-y-2">
                  {suggestions.slice(0, 4).map((s) => (
                    <div key={s.drink.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-stone-100">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">{s.drink.name}</p>
                        <p className="text-[11px] text-slate-400 italic truncate">{s.note}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        <span className="text-xs font-semibold text-amber-700">£{Number(s.drink.price).toFixed(2)}</span>
                        {onAddToCart && (
                          <button
                            onClick={() => onAddToCart(s.drink)}
                            className="w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center text-sm font-bold hover:bg-amber-600 transition-colors"
                            aria-label={`Add ${s.drink.name} to order`}
                          >
                            +
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Footer / Checkout */}
        {items.length > 0 && (
          <div className="border-t border-stone-100 px-6 py-4 space-y-3 bg-white">
            {/* Subtotal */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Subtotal</span>
              <span className="text-sm text-slate-700">£{subtotal.toFixed(2)}</span>
            </div>
            {/* Service charge */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Service charge (10%)</span>
              <span className="text-sm text-slate-700">£{(subtotal * 0.10).toFixed(2)}</span>
            </div>
            {/* Total */}
            <div className="flex items-center justify-between pt-2 border-t border-stone-200">
              <span className="text-base font-semibold text-slate-800">Total</span>
              <span className="text-lg font-bold text-slate-800">£{(subtotal * 1.10).toFixed(2)}</span>
            </div>
            <p className="text-[11px] text-slate-400 text-center">An optional 10% service charge is included</p>

            {/* Order notes */}
            <textarea
              placeholder="Add special requests for the whole order..."
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              rows={2}
              className="w-full text-sm text-slate-600 placeholder-slate-300 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-400 focus:border-transparent resize-none"
            />

            {/* Table number, name, email */}
            <div className="flex gap-2">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Table number *"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  className={`w-full text-sm bg-stone-50 border rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-amber-400 focus:border-transparent ${
                    !tableNumber.trim() ? "border-amber-300" : "border-stone-200"
                  }`}
                />
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Your name (optional)"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full text-sm bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-amber-400 focus:border-transparent"
                />
              </div>
            </div>

            {/* Email for receipt */}
            <div>
              <label className="block text-xs text-slate-400 mb-1 ml-1">Email for receipt (optional)</label>
              <input
                type="email"
                placeholder="you@email.com"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="w-full text-sm bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-amber-400 focus:border-transparent"
              />
            </div>

            {/* Error message */}
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                {error}
              </div>
            )}

            {/* Place Order button */}
            <button
              onClick={handlePlaceOrder}
              disabled={!tableNumber.trim() || submitting}
              className={`w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 shadow-sm ${
                tableNumber.trim() && !submitting
                  ? "bg-amber-500 text-white hover:bg-amber-600 shadow-amber-200 active:scale-[0.98]"
                  : "bg-stone-200 text-stone-400 cursor-not-allowed"
              }`}
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Placing order...
                </span>
              ) : (
                `Place Order — £${(subtotal * 1.10).toFixed(2)}`
              )}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

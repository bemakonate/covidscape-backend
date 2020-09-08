const TAX_RATE = process.env.TAX_RATE || .01;
const FREE_SHIPPING_THRESHOLD = process.env.FREE_SHIPPING_THRESHOLD || 100;
const SHIPPING_RATE = process.env.SHIPPING_RATE || 5;

const cartSubtotal = (cart) => {

    const subtotal = cart.reduce((counter, product) => {
        return counter + (product.price * product.qty)
    }, 0)
    return subtotal;
}

const shouldPayShipping = (cart) => {
    const subtotal = cartSubtotal(cart);
    return subtotal < FREE_SHIPPING_THRESHOLD
}
const cartTaxes = (cart) => {
    const subtotal = cartSubtotal(cart);
    return subtotal * TAX_RATE;
}

const cartTotal = (cart) => {
    const subtotal = cartSubtotal(cart);
    const shipping = shouldPayShipping(cart) ? SHIPPING_RATE : 0;
    const total = (subtotal * (1 + TAX_RATE)) + shipping;

    return total;
}

module.exports = {
    cartSubtotal,
    shouldPayShipping,
    cartTaxes,
    cartTotal,
}
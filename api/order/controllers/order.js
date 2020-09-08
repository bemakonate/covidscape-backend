'use strict';
const stripe = require('stripe')(process.env.STRIPE_SECRET_TEST_KEY);
const { sanitizeEntity } = require('strapi-utils');


/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

module.exports = {
    setUpStripe: async (ctx) => {
        //Through ctx.request.body we will receive the products and the quantity
        let total = 100;
        let validatedCart = [];
        let reciptCart = []; //Because stripe wants less than 500 char

        //Only take the id of each product
        const { cart } = ctx.request.body;

        //Make sure we validate each product before we run the next block of code
        await Promise.all(cart.map(async (product) => {
            const validatedProduct = await strapi.services.product.findOne({
                id: product.id
            })

            if (validatedProduct) {
                validatedProduct.qty = product.qty;
                validatedCart.push(validatedProduct);
                reciptCart.push({ id: product.id, qty: product.qty });
            }

            return validatedProduct;

        }))



        //Use the data from strapi to calc the price of each product
        //To get the total
        total = strapi.config.functions.cart.cartTotal(validatedCart);
        total = total.toFixed(2); //make sure total is to nearest hunredth


        try {
            const paymentIntent = await stripe.paymentIntents.create({
                amount: total * 100,
                currency: 'usd',
                payment_method_types: ['card'],
                metadata: { validatedCart: JSON.stringify(reciptCart) }
            });

            return paymentIntent

        } catch (err) {
            return { error: err.raw.message }
        }
    },

    create: async (ctx) => {

        const {
            paymentIntent,
            cart,
            shipping_name,
            shipping_address,
        } = ctx.request.body;
        //Payment intent for validation
        let paymentInfo;
        try {
            paymentInfo = await stripe.paymentIntents.retrieve(paymentIntent.id);
            if (paymentInfo.status !== 'succeeded') {
                throw { message: "You still have to pay" }
            }
        } catch (err) {
            ctx.response.status = 402;
            return { error: err.message }
        }

        const payment_intent_id = paymentIntent.id;

        //Check if paymentIntent wasn't already used
        const alreadyExistingOrder = await strapi.services.order.find({
            payment_intent_id: paymentIntent.id
        })

        if (alreadyExistingOrder && alreadyExistingOrder.length > 0) {
            ctx.response.status = 402;
            return { error: "This payment intent was already used" }
        }



        //check if the data is proper

        let product_qty = [];
        let products = [];
        let sanitizedCart = [];


        await Promise.all(cart.map(async (product) => {
            const foundProduct = await strapi.services.product.findOne({ id: product.id });
            if (foundProduct) {
                product_qty.push({
                    id: product.id,
                    qty: product.qty
                })

                products.push(foundProduct);
                sanitizedCart.push({ ...foundProduct, ...{ qty: product.qty } })
            }
            // Must return because of map method. We don’t necessarily need the returned data 
            return foundProduct;
        }))



        //Fetch products and add to products arrary
        //Set up product_qty

        let total_in_cents = strapi.config.functions.cart.cartTotal(sanitizedCart).toFixed(2) * 100;
        let taxes_in_cents = strapi.config.functions.cart.cartTaxes(sanitizedCart).toFixed(2) * 100;
        let subtotal_in_cents = strapi.config.functions.cart.cartSubtotal(sanitizedCart).toFixed(2) * 100;


        //Payment intent amount needs to be the same amount as total of the cart being saved
        if (paymentInfo.amount !== total_in_cents) {
            ctx.response.status = 402;
            return "The total payment is different from the payment intent"
        }

        //To add field to collection you need to define the property name define in the cms
        const entry = {
            shipping_name,
            shipping_address,

            product_qty,
            products,
            subtotal_in_cents,
            taxes_in_cents,
            total_in_cents,
            payment_intent_id,
        }

        //create the new collection
        let entity = strapi.services.order.create(entry);

        //Save the new new collection to the db
        return sanitizeEntity(entity, { model: strapi.models.order });
    }
};

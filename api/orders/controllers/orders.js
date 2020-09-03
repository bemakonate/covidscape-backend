'use strict';
const stripe = require('stripe')(process.env.STRIPE_SECRET_TEST_KEY);
const { sanitizeEntity } = require('strapi-utils');

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

module.exports = {
    setUpStripe: async ctx => {
        const res = ctx.response;
        const req = ctx.request;

        const { id, amount } = req.body;
        try {
            const payment = await stripe.paymentIntents.create({
                amount,
                currency: 'USD',
                description: 'Delicious empandas',
                payment_method: id,
                confirm: true //Will charge right away,instead of waiting to confirm
            })
            return {
                confirm: '123343'
            };

        } catch (err) {
            return {
                messsage: err.message
            }

        }

    },
};

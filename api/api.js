/**
 * API
 */

import bearerAuthPlugin from '@fastify/bearer-auth'

import * as transbank from './transbank.js'

/**
 * Extend Routes
 * @param {object} app - The application server object
 * @param {string} basePath - The base path
 * @returns {undefined}
 */
function setRoutes(app, basePath) {

	//* bearer auth required routes
	app.register(async (instance, opts) => {

		// bearer auth plugin
		await instance.register(bearerAuthPlugin, { keys: new Set([process.env.API_KEY]) })

		// routes
		await instance.post(`${basePath}trx/create`, (req, res) => transbank.createTrx(req, res))

		await instance.post(`${basePath}trx/refund`, (req, res) => transbank.refund(req, res))
	})

	// * no bearer auth required (transbank callbacks)
	app.get(`${basePath}trx/authorize/:hash`, (req, res) => transbank.authorizeTrx(req, res))
	app.post(`${basePath}trx/authorize/:hash`, (req, res) => transbank.authorizeTrx(req, res))

	return app
}

/**
 * Export
 */
export {

	setRoutes,
}

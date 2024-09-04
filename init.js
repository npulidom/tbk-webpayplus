/**
 * Init
 */

import * as mongo     from './api/mongo.js'
import * as server    from './api/server.js'
import * as api       from './api/api.js'
import * as transbank from './api/transbank.js'

/**
 * Base Path
 * @constant {string} BASE_PATH - The base path
 */
const BASE_PATH = server.getBasePath()

/**
 * Version
 * @constant {string} VERSION - The build version
 */
const VERSION = process.env.BUILD_ID

/**
 * Init App
 */
async function init() {

	/**
	 * Setup
	 */
	const app = await server.create()
	// mongo
	await mongo.connect()
	// transbank
	await transbank.setup()

	/**
	 * Hooks
	 */
	app.addHook('onRequest', async (req, res) => {

		// * health endpoint exception
		if (/\/health$/.test(req.routeOptions.url))
			return

		// * OPTIONS preflight / POST (CORS)
		if (/OPTIONS|POST/.test(req.method)) {

			server.setCorsHeaders(res)
			res.code(200)
		}

		// * empty body fallback
		if (req.method == 'POST' && !req.body) req.body = {}
	})
	// on-send event
	app.addHook('onSend', async (req, res, payload) => {

		// application error default status code
		if (res.statusCode == 200 && /"status":"error"/.test(payload))
			res.code(418)
	})

	/**
	 * Extend app routes
	 */
	api.setRoutes(app, BASE_PATH)

	/**
	 * Handler - Not Found
	 */
	app.setNotFoundHandler((req, res) => res.code(404).send({ error: 'not found' }) )

	/**
	 * Handler - Internal Error
	 */
	app.setErrorHandler((error, req, res) => {

		app.log.error(`Init (errorHandler) -> exception:`)
		app.log.error(error)
		// response
		res.code(500).send({ status: 'error', error })
	})

	// start server
	await app.listen({ port: 80, host: '0.0.0.0' })
	app.log.info(`Init -> server-up, date=${new Date().toString()} base-path=${BASE_PATH} version=${VERSION}`)
}

/**
 * Gracefull exit
 * @param {string} signal - The signal
 * @returns {undefined}
 */
async function exitGracefully(signal) {

	console.log(`Init (exitGracefully) -> ${signal} signal event`)

	await server.shutdown()
	process.exit(0)
}

// process signal events
process.on('SIGINT', exitGracefully)
process.on('SIGTERM', exitGracefully)

// start app
try       { await init() }
catch (e) { console.error('Init -> main exception', e) }

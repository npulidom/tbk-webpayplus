/**
 * Server
 */

import fastify from 'fastify'
import formbody from '@fastify/formbody'

/**
 * Logger Environment
 * @constant {object} LOGGER_ENV - The logger environment for pino
 */
const LOGGER_ENV = {

	development: {

		level: 'debug',
		transport: {

			target: 'pino-pretty',
			options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname', colorize: true, singleLine: true }
		}
	},
	production: {

		level: Number.parseInt(process.env.DEBUG_LOGS || 0) ? 'debug' : 'info'
	}
}

/**
 * The application instance
 * @property {object} app - The app instance
 */
let app

/**
 * Create Server
 * @param {string} basePath - The base path for static assets setup
 * @returns {object}
 */
async function create() {

	// get base path
	const basePath = getBasePath()

	// new server instance
	app = fastify({

		logger                : LOGGER_ENV[process.env.NODE_ENV],
		disableRequestLogging : true,
		trustProxy            : true, // AWS ALB
		ignoreTrailingSlash   : true,
		ignoreDuplicateSlashes: true,
	})

	// health check route
	const healthCheck = (req, res) => res.send('OK')

	app.get(`/health`, healthCheck)
	// public health check
	if (basePath != '/')
		app.get(`${basePath}health`, healthCheck)

	// form body parser
	app.register(formbody)

	// return instance
	return app
}

/**
 * Gets the Base Path
 * @returns {string}
 */
function getBasePath() {

	let { pathname } = new URL(process.env.BASE_URL)

	// append ending slash
	if (!pathname.endsWith('/')) pathname += '/'

	return pathname
}

/**
 * Gets the Base URL
 * @param {string} path - An input path
 * @returns {string}
 */
function getBaseUrl(path) {

	let url = process.env.BASE_URL

	// remove ending slash
	if (url.endsWith('/')) url = url.substring(0, url.length - 1)

	if (path) {

		// remove first slash
		if (path.startsWith('/')) path = path.substring(1)

		url += `/${path}`
	}

	// append ending slash
	if (!url.endsWith('/')) url += '/'

	return url
}

/**
 * Set CORS headers
 * @param {object} res - The response object
 * @returns {undefined}
 */
function setCorsHeaders(res, origin = '*') {

	res.header('Access-Control-Allow-Origin', origin)
	res.header('Access-Control-Allow-Methods', 'OPTIONS, HEAD, GET, POST')
	res.header('Access-Control-Allow-Headers', 'Content-Type, Origin, Referer, X-Requested-With, Authorization')
}

/**
 * Server Shutdown
 * @returns {undefined}
 */
async function shutdown() {

	if (!app) return

	app.log.info(`Server (shutdown) -> shutting down server ...`)
	// close server
	await app.close()
}

/**
 * Export
 */
export {

	app,
	create,
	getBasePath,
	getBaseUrl,
	setCorsHeaders,
	shutdown,
}

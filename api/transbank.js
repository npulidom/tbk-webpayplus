/**
 * Transbank (Webpay Plus)
 */

import { ObjectId } from 'mongodb'
import xss from 'xss'

import tbk from 'transbank-sdk'
// common-js lib restriction
const { WebpayPlus } = tbk

import * as mongo from './mongo.js'
import * as server from './server.js'

import { encrypt, decrypt } from './utils.js'

/**
 * Collection
 * @constant {object} COLLECTION - The collection names
 */
const COLLECTION = {

	transactions: 'tbkWebpayPlusTrx',
}

/**
 * Production Environment
 * @constant {boolean} IS_ENV_PROD - Flag for production environment
 */
const IS_ENV_PROD = !!process.env.TBK_CODE && !!process.env.TBK_KEY

/**
 * Setup
 * @returns {undefined}
 */
async function setup() {

	// logger
	const { log } = server.app

	// check redirect URLs
	if (!process.env.BASE_URL) throw 'INVALID_BASE_URL'
	if (!process.env.TBK_SUCCESS_URL) throw 'INVALID_TBK_SUCCESS_URL'
	if (!process.env.TBK_FAILED_URL) throw 'INVALID_TBK_FAILED_URL'

	// testing
	if (!IS_ENV_PROD)
		return WebpayPlus.configureForTesting()

	// production credentials
	log.info(`Transbank (setup) -> production mode, code=${process.env.TBK_CODE} tbk-key=${process.env.TBK_KEY.substring(0, 3)}****`)

	WebpayPlus.configureForProduction(process.env.TBK_CODE, process.env.TBK_KEY)
}

/**
 * Action - Create Trx
 * @param {object} req - The request object
 * @param {object} res - The response object
 * @returns {undefined}
 */
async function createTrx(req, res) {

	let {

		buyOrder  = '',
		sessionId = '',
		amount    = 0
	} = req.body

	try {

		// parse user data
		buyOrder  = xss(buyOrder).trim()
		sessionId = xss(sessionId).trim()
		amount    = Number(amount)

		if (!sessionId) throw 'INVALID_SESSION_ID'
		if (!amount) throw 'INVALID_AMOUNT'

		// check if transaction already exists
		if (await mongo.count(COLLECTION.transactions, { buyOrder })) throw 'TRX_ALREADY_PROCESSED'

		const hash      = encrypt(buyOrder)
		const returnUrl = server.getBaseUrl(`trx/authorize/${hash}`)

		req.log.info(`Transbank (createTrx) -> creating transaction, buyOrder=${buyOrder} sessionId=${sessionId}`)

		// transbank API call
		const $tbk = new WebpayPlus.Transaction(WebpayPlus.options)
		const { token, url } = await $tbk.create(buyOrder, sessionId, amount, returnUrl)
		// response validation
		if (!token || !url) throw 'UNEXPECTED_TBK_RESPONSE'

		req.log.info(`Transbank (createTrx) -> response received, token=${token.substring(0, 3)}****`)

		return { status: 'ok', url, token }
	}
	catch (e) {

		req.log.error(`Transbank (createTrx) -> exception: ${e.toString()}`)
		return { status: 'error', error: e.toString().replace(/\n/g, '. ') }
	}
}

/**
 * Action - Authorize Trx
 * @param {object} req - The request object
 * @param {object} res - The response object
 * @returns {undefined}
 */
async function authorizeTrx(req, res) {

	let buyOrder
	let tbkResCode
	let redirectUrl

	try {

		const { hash = '' } = req.params
		const { token_ws:TBK_TOKEN = '' } = req.query

		// decrypt buy order
		buyOrder = hash ? decrypt(hash) : null

		// validate params
		if (!TBK_TOKEN) throw 'INVALID_TBK_TOKEN'
		if (!buyOrder) throw 'INVALID_BUY_ORDER'

		req.log.debug(`Transbank (authorizeTrx) -> params, buyOrder=${buyOrder} tbk-token=${TBK_TOKEN}`)

		// check if transaction already exists
		if (await mongo.count(COLLECTION.transactions, { buyOrder })) throw 'TRX_ALREADY_PROCESSED'

		// transbank API call
		const $tbk = new WebpayPlus.Transaction(WebpayPlus.options)
		const response = await $tbk.commit(TBK_TOKEN)

		// response code
		tbkResCode = response.response_code
		req.log.info(`Transbank (authorizeTrx) -> response code=${tbkResCode}`)

		if (tbkResCode !== 0) throw `UNEXPECTED_TBK_RESPONSE:${tbkResCode}`
		if (buyOrder !== response.buy_order) throw `INVALID_TBK_RESPONSE_BUY_ORDER:${response.buy_order}`

		req.log.info(`Transbank (authorizeTrx) -> transaction comitted successfully, buyOrder=${buyOrder}`)

		const cardNumber = response.card_detail?.card_number // last 4 digits (remove xx/** from card number)

		const trx = {

			_id         : new ObjectId(),
			buyOrder    : response.buy_order,
			sessionId   : response.session_id,
			authCode    : response.authorization_code,
			paymentType : response.payment_type_code,
			amount      : Number(response.amount),
			shares      : Number(response.installments_number || 1),
			sharesAmount: Number(response.installments_amount) || Number(response.amount),
			cardDigits  : cardNumber ? cardNumber.substring(cardNumber.length - 4) : null,
			tbkStatus   : response.status,
			tbkVci      : response.vci,
			tbkToken    : TBK_TOKEN,
			createdAt   : new Date(response.transaction_date),
		}

		// update inscription
		await mongo.insertOne(COLLECTION.transactions, trx)

		req.log.info(`Transbank (authorizeTrx) -> transaction saved successfully, id=${trx._id}`)

		redirectUrl = `${process.env.TBK_SUCCESS_URL}?buyOrder=${buyOrder}`
	}
	catch (e) {

		req.log.error(`Transbank (authorizeTrx) -> exception: ${e.toString()}`)

		const params = new URLSearchParams()
		// params
		if (buyOrder) params.set('buyOrder', buyOrder)
		if (tbkResCode) params.set('tbkResCode', tbkResCode)

		const qs = params.size ? `?${params.toString()}` : ''
		redirectUrl = `${process.env.TBK_FAILED_URL}${qs}`
	}
	finally {

		req.log.info(`Transbank (authorizeTrx) -> redirecting, url=${redirectUrl}`)
		// redirect
		return res.redirect(redirectUrl)
	}
}

/**
 * Action - Refund transaction
 * @param {object} req - The request object
 * @param {object} res - The response object
 * @returns {undefined}
 */
async function refund(req, res) {

	let {

		buyOrder = '', // saved buyOrder
		authCode = '', // saved authCode
		amount   = '', // amount to refund
	} = req.body

	try {

		// sanitize inputs
		buyOrder = xss(buyOrder).trim()
		authCode = xss(authCode).trim()
		amount   = Number.parseInt(amount) || 0

		if (!buyOrder) throw 'INVALID_BUY_ORDER'
		if (!authCode) throw 'INVALID_AUTH_CODE'
		if (!amount) throw 'INVALID_AMOUNT'

		// get trx
		const trx = await mongo.count(COLLECTION.transactions, { buyOrder, authCode })
		// check if payment has not processed yet
		if (!trx || !trx.tbkToken) throw 'TRX_WITH_AUTH_CODE_NOT_FOUND'

		req.log.info(`Transbank (refund) -> refunding transaction, buyOrder=${buyOrder}`)

		// transbank API call
		const $tbk     = new WebpayPlus.Transaction(WebpayPlus.options)
		const response = await $tbk.refund(trx.tbkToken, amount)

		req.log.info(`Transbank (refund) -> response ok: ${JSON.stringify(response)}, buyOrder=${buyOrder}`)

		if (!/REVERSED|NULLIFIED/.test(response.type))
			throw `UNEXPECTED_TBK_RESPONSE_${response.type || 'NAN'}`

		req.log.info(`Transbank (refund) -> transaction refunded successfully! buyOrder=${buyOrder}`)

		return { status: 'ok', response }
	}
	catch (e) {

		req.log.warn(`Transbank (refund) -> exception: ${e.toString()}`)

		return { status: 'error', error: e.toString().replace(/\n/g, '. ') }
	}
}

/**
 * Export
 */
export {

	setup,
	createTrx,
	authorizeTrx,
	refund,
}

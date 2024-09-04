/**
 * Utils
 */

import crypto from 'crypto'

/**
 * Encryption Key
 * @constant {string} ENCRYPTION_KEY - Some crypto key
 */
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(16).toString('hex')

/**
 * Encrypt a string
 * @link https://gist.github.com/vlucas/2bd40f62d20c1d49237a109d491974eb
 * @param {string} text - The input text
 * @returns {string}
 */
function encrypt(text) {

	const iv     = crypto.randomBytes(16) // IV-length, use 16 for AES
	const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv)

	let encrypted = cipher.update(text)
	encrypted = Buffer.concat([encrypted, cipher.final()])

	return `${iv.toString('hex')}-${encrypted.toString('hex')}`
}

/**
 * Decrypt a hash
 * @param {string} text - The input encrypted text
 * @returns {string}
 */
function decrypt(text) {

	const textParts     = text.split('-')
	const iv            = Buffer.from(textParts.shift(), 'hex')
	const encryptedText = Buffer.from(textParts.join('-'), 'hex')
	const decipher      = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv)

	let decrypted = decipher.update(encryptedText)
	decrypted = Buffer.concat([decrypted, decipher.final()])

	return decrypted.toString()
}

/**
 * Export
 */
export {

	encrypt,
	decrypt,
}

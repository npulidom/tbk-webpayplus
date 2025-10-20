/**
 * Mongo
 */

import { MongoClient, ObjectId } from 'mongodb'

/**
 * Database Instance
 * @property {object} DB - The database instance
 */
let DB

/**
 * DB Connect
 * @returns {undefined}
 */
async function connect() {

	DB = (await MongoClient.connect(process.env.MONGO_URL)).db()
}

/**
 * Count total documents
 * @param {string} coll - The input collection
 * @param {object} query - The query
 * @returns {number}
 */
async function count(coll, query = {}) {

	return await DB.collection(coll).countDocuments(query)
}

/**
 * Find One
 * @param {string} coll - The input collection
 * @param {object} query - The query object
 * @returns {object|null}
 */
async function findOne(coll, query = {}) {

	if (typeof query._id == 'string' && /^[a-f\d]{24}$/i.test(query._id))
		query._id = new ObjectId(query._id)

	return await DB.collection(coll).findOne(query)
}

/**
 * Find Many
 * @param {string} coll - The input collection
 * @param {object} query - The query object
 * @param {object} opts - The options object
 * @param {object} sort - The sort object
 * @returns {array}
 */
async function find(coll, query = {}, opts = {}, sort = { _id: 1 }) {

	return await DB.collection(coll).find(query, opts).sort(sort).toArray()
}

/**
 * Insert One
 * @param {string} coll - The input collection
 * @param {object} doc - The document object
 * @returns {object}
 */
async function insertOne(coll, doc) {

	return await DB.collection(coll).insertOne(doc)
}

/**
 * Save with upsert fallback
 * @param {string} coll - The input collection
 * @param {object} doc - The document object
 * @returns {object}
 */
async function save(coll, doc) {

	return await DB.collection(coll).updateOne({ _id: doc._id || new ObjectId() }, { $set: doc }, { upsert: true })
}

/**
 * Update One
 * @param {string} coll - The input collection
 * @param {object} query - The query object
 * @param {object} update - The update object
 * @returns {object}
 */
async function updateOne(coll, query, update) {

	if (typeof query._id == 'string' && /^[a-f\d]{24}$/i.test(query._id))
		query._id = new ObjectId(query._id)

	return await DB.collection(coll).updateOne(query, update)
}

/**
 * Delete One
 * @param {string} coll - The input collection
 * @param {object} query - The input query
 * @returns {object}
 */
async function deleteOne(coll, query) {

	return await DB.collection(coll).deleteOne(query)
}

/**
 * Export
 */
export {

	connect,
	count,
	findOne,
	find,
	insertOne,
	save,
	updateOne,
	deleteOne,
}

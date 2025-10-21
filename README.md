# Transbank Webpay Plus

Container service for Transbank Webpay Plus API using MongoDB as database storage.

- MongoDB v4+ required
- NOTE: For security reasons, prevent exposing this API directly at client-side applications.

[Github Repository](https://github.com/npulidom/tbk-webpayplus)

## Env-vars

```yml
MONGO_URL: MongoDB URL, required (i.e. mongodb://mongo/app)
BASE_URL: Base URL for cloud setup, a path in URL is supported (i.e. https://myservices.com/tbk-webpayplus/)
API_KEY: Service API Key (required)
ENCRYPTION_KEY: Key for URL encrypt/decrypt (optional, must be 32 chars length)
TBK_CODE: Webpay Plus Store Code for production (a.k.a código comercio)
TBK_KEY: Webpay Plus API Key for production
TBK_SUCCESS_URL: Payment success URL
TBK_FAILED_URL: Payment failed URL
DEBUG_LOGS: Enable debug logs in production environment
```

## Usage

Pull image

```bash
docker pull npulidom/tbk-webpayplus
```

Run the container

```bash
docker run -p 8080:80 --env-file .env npulidom/tbk-webpayplus
```

## API Endpoints

### Headers

- `Content-Type: application/json`
- `Authorization: Bearer {token}` (optional)

### GET /health

Endpoint for service health checks.

```bash
curl -i https://{host}/health
```

### POST /trx/create

Body Params

- buyOrder `string`
- sessionId `string`
- amount `number`

```bash
curl -iX POST -H 'Content-Type: application/json' -H 'Authorization: Bearer {API-KEY}' -d '{ "buyOrder": "240830VHY3", "sessionId": "66d19c1d8ef6c3a5d452d715", "amount": 15000 }' {BASE_URL}/trx/create
```

### POST /trx/refund

Body Params

- buyOrder `string`
- authCode `string`
- amount `number`

```bash
curl -iX POST -H 'Content-Type: application/json' -H 'Authorization: Bearer {API-KEY}' -d '{ "buyOrder": "12345678", "authCode": "123456", "amount": 800 }' {BASE_URL}/trx/refund
```

### Response Format

```javascript
// output response ok
{
    "status": "ok",
    ...payload
}

// output response error
{
    "status": "error",
    "error": "SOME_ERROR"
}
```

## Test

### Integration Test Data

```text
# Credit Card
4051885600446623 (success)
5186059559590568 (fail)
CV: 123

# Debit Card
4051884239937763 (success)
5186008541233829 (fail)

# Prepaid Card
4051886000056590 (Visa success)
5186174110629480 (Mastercard success)
CV: 123

# Certification Login
user: 11111111-1
pass: 123
```

### Endpoint Test

> 1. Get a transaction token. Example:

```sh
curl -iX POST -H 'Content-Type: application/json' -H 'Authorization: Bearer some-secret' \
-d '{ "buyOrder": "240830VHY3", "sessionId": "66d19c1d8ef6c3a5d452d715", "amount": 15000 }' http://g-tbk-webpayplus.localhost/trx/create
```

> 2. Send form using `test/init.html` example (exposing test folder using `http-server` node package):

```sh
~ cd test
~ http-server
```

> 3. Access `http://localhost:8080/init.html?token={token}` in your browser passing the token received from the previous step.


## Reference

- [Transbank Webpay Plus Docs](https://www.transbankdevelopers.cl/documentacion/webpay-plus)

# Transbank Webpay Plus

Container service for Transbank Webpay Plus API using MongoDB as database storage.

- MongoDB v4+ required
- NOTE: For security reasons, prevent exposing this API directly at client-side applications.

## Env-vars

```yml
MONGO_URL: MongoDB URL, required (i.e. mongodb://mongo/app)
BASE_URL: Base URL for cloud setup, a path in URL is supported (i.e. https://myservices.com/tbk-webpayplus/)
API_KEY: Service API Key (required)
ENCRYPTION_KEY: Key for URL encrypt/decrypt (optional, max. 32 chars)
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

## Test Data

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

## Reference

- [Transbank Webpay Plus Docs](https://www.transbankdevelopers.cl/documentacion/webpay-plus)

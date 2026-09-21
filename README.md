# Auction Bid API

A small Node.js/Express bidding service backed by MongoDB and Mongoose.

## Assignment ID

`v#hdf38%44`

## Setup

Requirements:
- Node.js 18+
- MongoDB running locally or a reachable MongoDB instance

From the project root:

```bash
cd src
npm install
```

Create `src/.env`:

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/auction_db
```

Then start the server:

```bash
npm run dev
```

The application connects to MongoDB before starting the HTTP server. If the database connection fails, the server exits instead of accepting requests without a database.

## API

### POST `/bid`

Request:

```json
{
  "auction_id": "64f000000000000000000001",
  "user_id": "user-123",
  "amount": 500
}
```

A bid is accepted only when:
- the auction exists;
- the auction has started;
- the current time is strictly before `endTime`; and
- the amount is strictly greater than the current top bid.

Successful response: `201 Created`.

Lower/equal bids and bids for closed auctions return `409 Conflict`. Unknown auctions return `404`. Invalid input returns `400`.

For a quick local demo, create a sample auction with:

```bash
npm run seed
```

The command prints the created auction ID.

## Data model

The main MongoDB collection is `auctions`.

An auction contains:

- `title`
- `startTime`
- `endTime`
- `currentBid`: the authoritative current top bid
- `bids`: the accepted bid history

Each bid contains:

- `_id`
- `userId`
- `amount`
- `createdAt`

### Why bids are embedded

The assignment needs the current top bid to be unambiguous even when multiple requests arrive at the same time. Keeping the accepted bid history and `currentBid` in the same MongoDB document lets the service update both with one atomic `findOneAndUpdate`.

This avoids the unsafe pattern of:

1. read the current bid;
2. compare in application code;
3. insert a bid;
4. update the auction.

That multi-step approach can lose races between concurrent requests.

## Auction-close boundary

The close rule is:

```text
now < endTime
```

Therefore:
- a bid before `endTime` can be accepted;
- a bid at exactly `endTime` is rejected;
- a bid after `endTime` is rejected.

The `endTime` condition is part of the same atomic database update that accepts the bid, so a stale application-side check cannot accept a bid after the auction has closed.

## New bid handling

The database update requires:

```text
new amount > currentBid.amount
```

If there is no current bid, the first valid bid is accepted.

The condition and update happen atomically on the auction document. MongoDB serializes competing updates to the same document, so a lower bid cannot overwrite a higher bid that has already become current.

## Repeated bid requests

The API does not treat repeated identical requests as idempotent because the request contract does not contain an idempotency key.

Submitting the exact same amount twice therefore has this behavior:
- first request: accepted if it is the first/highest valid bid;
- second request: rejected because it is not strictly higher.

In production, if clients can retry requests and need retry-safe semantics, an explicit idempotency key should be added and stored with accepted bids.

## Current top bidder bidding again

A current top bidder is allowed to bid again, but only with a strictly higher amount. Being the current bidder does not give them any special priority.

For example, if user A is currently at 500:
- A bidding 500 is rejected;
- A bidding 501 is accepted;
- another user bidding 501 is rejected if A's 501 has already been committed.

## Error handling

The endpoint validates request shape and amount before touching the database. Database failures are passed to the Express error handler and return a generic `500 Internal Server Error` without exposing internal details.

## Tests

Run:

```bash
npm test
```

The integration tests use the configured MongoDB URI (or `MONGODB_TEST_URI` when provided), create their own auctions, and cover:
- first bid;
- lower/equal bids;
- current bidder increasing their bid;
- auction close;
- unknown auction;
- invalid input;
- concurrent bids.

For an isolated test database, set:

```env
MONGODB_TEST_URI=mongodb://localhost:27017/auction_test
```

## Production consideration

Embedding the entire bid history inside the auction document is deliberately simple and makes the bid acceptance operation atomic. It is not ideal for auctions with very large bid histories because MongoDB documents have a size limit and large arrays become increasingly expensive to update.

A production-scale design would move historical bids to a separate `bids` collection while keeping a small authoritative `currentBid` state on the auction. That design should use a transaction or another durable consistency mechanism so the bid history and current auction state cannot diverge.

## Project structure

```text
src/
├── db/
│   └── mongoose.js
├── models/
│   ├── auction.js
│   └── index.js
├── scripts/
│   └── seed.js
├── services/
│   └── bidding.js
├── test/
│   └── bid.test.js
├── app.js
├── server.js
└── package.json
```

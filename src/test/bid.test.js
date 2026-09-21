const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const mongoose = require("mongoose");

const app = require("../app");
const { Auction } = require("../models/auction");
const { placeBid, BID_RESULT } = require("../services/bidding");
const { connectToDatabase, disconnectFromDatabase } = require("../db/mongoose");

const TEST_DB_URI =
    process.env.MONGODB_TEST_URI ||
    process.env.MONGODB_URI ||
    "mongodb://localhost:27017/auction_test";

let server;
let baseUrl;

const postBid = async (body) => {
    const response = await fetch(`${baseUrl}/bid`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
    });

    return {
        status: response.status,
        body: await response.json()
    };
};

test.before(async () => {
    process.env.MONGODB_URI = TEST_DB_URI;
    await connectToDatabase();

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
    await Auction.deleteMany({});
    await new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve()))
    );
    await disconnectFromDatabase();
});

const createAuction = async (overrides = {}) => {
    const now = new Date();

    return Auction.create({
        title: "Test Auction",
        startTime: new Date(now.getTime() - 60_000),
        endTime: new Date(now.getTime() + 60_000),
        ...overrides
    });
};

test("accepts the first bid", async () => {
    const auction = await createAuction();

    const response = await postBid({
        auction_id: auction._id.toString(),
        user_id: "user-1",
        amount: 100
    });

    assert.equal(response.status, 201);
    assert.equal(response.body.current_bid.amount, 100);

    const saved = await Auction.findById(auction._id).lean();
    assert.equal(saved.currentBid.amount, 100);
    assert.equal(saved.bids.length, 1);
});

test("rejects an equal or lower bid", async () => {
    const auction = await createAuction({
        currentBid: {
            bidId: new mongoose.Types.ObjectId(),
            userId: "user-1",
            amount: 100,
            createdAt: new Date()
        }
    });

    const equalResponse = await postBid({
        auction_id: auction._id.toString(),
        user_id: "user-2",
        amount: 100
    });

    assert.equal(equalResponse.status, 409);
    assert.equal(equalResponse.body.current_bid.amount, 100);

    const lowerResponse = await postBid({
        auction_id: auction._id.toString(),
        user_id: "user-2",
        amount: 99
    });

    assert.equal(lowerResponse.status, 409);
});

test("allows the current top bidder to increase their own bid", async () => {
    const auction = await createAuction();

    await postBid({
        auction_id: auction._id.toString(),
        user_id: "user-1",
        amount: 100
    });

    const response = await postBid({
        auction_id: auction._id.toString(),
        user_id: "user-1",
        amount: 125
    });

    assert.equal(response.status, 201);
    assert.equal(response.body.current_bid.amount, 125);
});

test("rejects a bid for an already closed auction", async () => {
    const auction = await createAuction({
        startTime: new Date(Date.now() - 60_000),
        endTime: new Date(Date.now() - 1)
    });

    const response = await postBid({
        auction_id: auction._id.toString(),
        user_id: "user-1",
        amount: 100
    });

    assert.equal(response.status, 409);
});

test("rejects a bid at the exact endTime boundary", async () => {
    const now = new Date();
    const auction = await Auction.create({
        title: "Boundary Auction",
        startTime: new Date(now.getTime() - 60_000),
        endTime: now
    });

    const result = await placeBid({
        auctionId: auction._id.toString(),
        userId: "user-1",
        amount: 100,
        now
    });

    assert.equal(result.type, BID_RESULT.AUCTION_CLOSED);
});

test("rejects bids for an unknown auction", async () => {
    const response = await postBid({
        auction_id: new mongoose.Types.ObjectId().toString(),
        user_id: "user-1",
        amount: 100
    });

    assert.equal(response.status, 404);
});

test("rejects invalid request data", async () => {
    const response = await postBid({
        auction_id: "not-an-object-id",
        user_id: "",
        amount: -10
    });

    assert.equal(response.status, 400);
});

test("concurrent bids leave the highest amount as currentBid", async () => {
    const auction = await createAuction();

    const amounts = [110, 175, 130, 220, 190];

    const responses = await Promise.all(
        amounts.map((amount, index) =>
            postBid({
                auction_id: auction._id.toString(),
                user_id: `user-${index}`,
                amount
            })
        )
    );

    const accepted = responses.filter((response) => response.status === 201);
    assert.ok(accepted.length >= 1);

    const saved = await Auction.findById(auction._id).lean();
    assert.equal(saved.currentBid.amount, Math.max(...amounts));
    assert.equal(saved.bids.length, accepted.length);
});

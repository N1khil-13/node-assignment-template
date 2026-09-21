const express = require("express");
const mongoose = require("mongoose");
const { placeBid, BID_RESULT } = require("./services/bidding,js");

const app = express();

app.use(express.json());

app.post("/bid", async (req, res, next) => {
    try {
        const { auction_id: auctionId, user_id: userId, amount } = req.body || {};

        if (
            typeof auctionId !== "string" ||
            auctionId.trim() === "" ||
            typeof userId !== "string" ||
            userId.trim() === "" ||
            typeof amount !== "number" ||
            !Number.isFinite(amount) ||
            amount <= 0
        ) {
            return res.status(400).json({
                error: "auction_id, user_id and a positive numeric amount are required."
            });
        }

        if (!mongoose.isValidObjectId(auctionId)) {
            return res.status(400).json({
                error: "auction_id must be a valid MongoDB ObjectId."
            });
        }

        const result = await placeBid({
            auctionId: auctionId.trim(),
            userId: userId.trim(),
            amount
        });

        switch (result.type) {
            case BID_RESULT.ACCEPTED:
                return res.status(201).json({
                    message: "Bid accepted.",
                    bid: result.bid,
                    current_bid: result.currentBid
                });

            case BID_RESULT.AUCTION_NOT_FOUND:
                return res.status(404).json({
                    error: "Auction not found."
                });

            case BID_RESULT.AUCTION_CLOSED:
                return res.status(409).json({
                    error: "Auction is not open for bidding."
                });

            case BID_RESULT.BID_TOO_LOW:
                return res.status(409).json({
                    error: "Bid must be strictly higher than the current top bid.",
                    current_bid: result.currentBid
                });

            default:
                throw new Error(`Unknown bid result: ${result.type}`);
        }
    } catch (error) {
        next(error);
    }
});

app.use((err, req, res, next) => {
    console.error(err);
    return res.status(500).json({ error: "Internal server error." });
});

module.exports = app;

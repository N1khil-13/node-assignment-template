require("dotenv").config();

const mongoose = require("mongoose");
const { connectToDatabase, disconnectFromDatabase } = require("../db/mongoose");
const { Auction } = require("../models/auction");

const run = async () => {
    await connectToDatabase();

    const now = new Date();
    const auction = await Auction.create({
        title: "Sample Auction",
        startTime: new Date(now.getTime() - 60 * 60 * 1000),
        endTime: new Date(now.getTime() + 24 * 60 * 60 * 1000)
    });

    console.log("Created sample auction:");
    console.log(auction._id.toString());
    console.log(`POST /bid with auction_id=${auction._id.toString()}`);

    await disconnectFromDatabase();
};

run().catch(async (error) => {
    console.error(error);
    await mongoose.disconnect().catch(() => { });
    process.exit(1);
});

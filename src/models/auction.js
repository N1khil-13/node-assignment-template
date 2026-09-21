const mongoose = require("mongoose");

const { Schema } = mongoose;

const bidSchema = new Schema(
    {
        _id: {
            type: Schema.Types.ObjectId,
            auto: true
        },
        userId: {
            type: String,
            required: true,
            trim: true
        },
        amount: {
            type: Number,
            required: true,
            min: 0.01
        },
        createdAt: {
            type: Date,
            required: true,
            default: Date.now
        }
    },
    {
        _id: true,
        id: false
    }
);

const currentBidSchema = new Schema(
    {
        bidId: {
            type: Schema.Types.ObjectId,
            required: true
        },
        userId: {
            type: String,
            required: true
        },
        amount: {
            type: Number,
            required: true,
            min: 0.01
        },
        createdAt: {
            type: Date,
            required: true
        }
    },
    {
        _id: false
    }
);

const auctionSchema = new Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true
        },
        startTime: {
            type: Date,
            required: true
        },
        endTime: {
            type: Date,
            required: true
        },
        currentBid: {
            type: currentBidSchema,
            default: null
        },
        bids: {
            type: [bidSchema],
            default: []
        }
    },
    {
        timestamps: true
    }
);

auctionSchema.pre("validate", function (next) {
    if (this.endTime <= this.startTime) {
        return next(new Error("endTime must be after startTime."));
    }
    next();
});

auctionSchema.index({ endTime: 1 });

const Auction = mongoose.model("Auction", auctionSchema);

module.exports = {
    Auction,
    bidSchema
};

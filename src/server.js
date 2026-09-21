require("dotenv").config();

const app = require("./app");
const { connectToDatabase } = require("./db/mongoose");

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await connectToDatabase();

    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (error) {
    console.error("Unable to start server:", error.message);
    process.exit(1);
  }
};

startServer();

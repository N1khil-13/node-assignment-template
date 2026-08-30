const express = require("express");
const { testConnection } = require("./db/sequelize");

const app = express();

app.use(express.json());

app.post("/bid", (req, res) => {
  return res.status(501).json({ message: "TODO: implement" });
});

app.use((err, req, res, next) => {
  console.error(err);
  return res.status(500).json({ message: "Internal server error" });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log(`Server listening on port ${PORT}`);
  await testConnection();
});

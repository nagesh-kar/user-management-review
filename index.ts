import express from "express";
import { authenticate } from "./auth";

const app = express();
const port = 3000;

app.get("/users", authenticate, (req, res) => {
  res.json(["user1", "user2", "user3", "user4", "user5"]);
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}...`);
});

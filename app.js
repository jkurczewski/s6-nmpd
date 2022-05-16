import express from "express";
import api from "./src/routes/routes";
require("dotenv").config();
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/", api);

app.listen(process.env.PORT);

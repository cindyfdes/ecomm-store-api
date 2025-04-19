import express from "express";

import dotenv from "dotenv";
dotenv.config();
const app = express();
const port = process.env.PORT;
import cors from "cors";

import { db } from "../configs/firebase-config/firebase-admin-config.js";
import { createNewUser } from "./../operations/user/createUser.js";
app.use(cors());
app.use(
  cors({
    origin: "http://localhost:3000", // Replace with your frontend URL
  })
);
app.use(express.json());

// Middleware to verify Firebase ID token
const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split("Bearer ")[1];
  if (!token) return res.status(401).send("No token provided");

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).send("Invalid or expired token");
  }
};

app.get("/api/getAllProducts", async (req, res) => {
  try {
    const snapshot = await db.collection("products").get();
    const users = snapshot.docs.map((doc) => doc.data());
    res.json(users);
  } catch (error) {
    res.status(500).send("Error getting users: " + error);
  }
});

app.get("/api/getProduct", async (req, res) => {
  try {
    const searchQuery = req.query.searchKeyword?.toLowerCase() || "";
    const snapshot = await db.collection("products").get();
    console.log("searchquery", searchQuery);
    const products = snapshot.docs
      .map((doc) => doc.data())
      .filter((product) => product.title?.toLowerCase().includes(searchQuery));

    res.json(products);
  } catch (error) {
    res.status(500).send("Error getting product : " + error);
  }
});

app.post("/api/user/save-new-user", async (req, res) => {
  try {
    console.log(req.body);
    const { email, userName, role } = req.body;

    await createNewUser({
      email,
      userName: userName || "",
      role: role || "user",
    });
    res.status(200).json({ message: "User saved successfully!" });
  } catch (error) {
    console.error("Error saving user:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

// app.get("/addProduct", async (req, resp) => {
//   let response = await fetch("https://fakestoreapi.com/products");
//   let productsFromUpstream = await response.json();

//   const productsRef = db.collection("products");

//   const batch = db.batch(); // Create a batch

//   productsFromUpstream.forEach((product) => {
//     const newDocRef = productsRef.doc(); // Create a new document with auto-generated ID
//     batch.set(newDocRef, product); // Add the product to the batch
//   });

//   // Commit the batch operation
//   await batch.commit();
// });

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

import express from "express";

import dotenv from "dotenv";
dotenv.config();
const app = express();
const port = process.env.PORT;
import cors from "cors";
import { getFirestore, collection, doc, deleteDoc } from "firebase/firestore";

import { db } from "../configs/firebase-config/firebase-admin-config.js";
import { createNewUser } from "./../operations/user/createUser.js";
import { verifyFirebaseToken } from "../operations/firebase-token/verify-firebase-token.js";
import { FieldValue } from "firebase-admin/firestore";
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json());

app.get("/api/getAllProducts", async (req, res) => {
  try {
    const snapshot = await db.collection("products").get();
    const users = snapshot.docs.map((doc) => doc.data());
    res.json(users);
  } catch (error) {
    res.status(500).send("Error getting users: " + error);
  }
});

app.get("/api/getAllCategories", async (req, res) => {
  try {
    const snapshot = await db.collection("category").get();
    const categories = snapshot.docs.map((doc) => ({
      categoryId: doc.id,
      ...doc.data(),
    }));
    res.json(categories);
  } catch (error) {
    res.status(500).send("Error getting category: " + error);
  }
});

app.get("/api/getProduct", async (req, res) => {
  try {
    const searchQuery = req.query.searchKeyword?.toLowerCase() || "";
    const category = req.query.category || "";
    const query = category
      ? db.collection("products").where("category", "==", category)
      : db.collection("products");

    const snapshot = await query.get();
    const products = snapshot.docs
      .map((doc) => doc.data())
      .filter((product) => product.title?.toLowerCase().includes(searchQuery));

    res.status(200).send(products);
  } catch (error) {
    res.status(500).send("Error getting product : " + error);
  }
});

app.get("/api/cart/getUserCart", verifyFirebaseToken, async (req, res) => {
  try {
    const cartSnapshot = await db
      .collection("cart")
      .where("email", "==", req.user.email)
      .get();

    const cartItems = cartSnapshot.docs?.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const productDetails = await Promise.all(
      cartItems.map(async (item) => {
        const productsSnapshot = await db
          .collection("products")
          .where("id", "==", item.productId)
          .get();

        if (!productsSnapshot.empty) {
          const product = productsSnapshot.docs[0].data();
          return { product: product, quantity: item.quantity, cartId: item.id };
        }

        return null;
      })
    );

    const filtered = productDetails?.filter((item) => item !== null);
    console.log("fileterd products", filtered);
    res.status(200).send(filtered);
  } catch (error) {
    console.log(error);
    res.status(500).send("Error getting cart items : " + error);
  }
});

app.post("/api/cart/save-cart-item", verifyFirebaseToken, async (req, res) => {
  try {
    const { productId, quantity, cartId } = req.body;
    let updatedCartId;
    if (cartId) {
      await db
        .collection("cart")
        .doc(cartId)
        .update({
          quantity: FieldValue.increment(quantity),
          updatedAt: new Date(),
        });
    } else {
      const docRef = await db.collection("cart").add({
        email: req.user.email,
        productId,
        quantity,
        createdAt: new Date(),
      });
      updatedCartId = docRef.id;
    }
    res.status(200).json({
      message: "Item added to cart successfully!",
      cartId: updatedCartId,
    });
  } catch (error) {
    console.error("Error saving user:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.post(
  "/api/cart/delete-cart-item",
  verifyFirebaseToken,
  async (req, res) => {
    try {
      const { cartId } = req.body;
      await db.collection("cart").doc(cartId).delete();
      res.status(200).json({ message: "Deleted item from cart successfully!" });
    } catch (error) {
      console.error("Error deleting items from cart:", error);
      res.status(500).json({ error: "Something went wrong" });
    }
  }
);

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

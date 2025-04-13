import { db } from "../../configs/firebase-config/firebase-admin-config.js";

export const createNewUser = async (user) => {
  const productsRef = db.collection("user");
  const newDocRef = productsRef.doc();
  await newDocRef.set(user);
};

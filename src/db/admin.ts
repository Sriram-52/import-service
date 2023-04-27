import * as admin from "firebase-admin";
import { ServiceAccount } from "firebase-admin";
import serviceAccountKey from "./serviceAccountKey.json";

admin.initializeApp({
	credential: admin.credential.cert(<ServiceAccount>serviceAccountKey),
});

const auth = admin.auth();
const db = admin.firestore();

export { auth, db };

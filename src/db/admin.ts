import * as admin from "firebase-admin";
import { ServiceAccount } from "firebase-admin";
import serviceAccountKey from "./serviceAccountKey.json";

admin.initializeApp({
	credential: admin.credential.cert(<ServiceAccount>serviceAccountKey),
	storageBucket: `${serviceAccountKey.project_id}.appspot.com`,
});

const auth = admin.auth();
const db = admin.firestore();
const storage = admin.storage();

export { auth, db, storage, admin };

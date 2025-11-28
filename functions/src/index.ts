
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import axios from "axios";
import cors from "cors";
import express from "express";

// Initialize Firebase Admin SDK
admin.initializeApp();

const app = express();

// Use CORS middleware. For production, configure it to allow only your app's domain.
app.use(cors({ origin: true }));

// Create a router for our API
const apiRouter = express.Router();

// Middleware to check Firebase Auth token
// const authenticate = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
//     const idToken = req.headers.authorization?.split("Bearer ")[1];
//     if (!idToken) {
//         res.status(403).send("Unauthorized: No token provided.");
//         return;
//     }
//     try {
//         const decodedToken = await admin.auth().verifyIdToken(idToken);
//         (req as any).user = decodedToken; 
//         next();
//     } catch (error) {
//         console.error("Error verifying token:", error);
//         res.status(403).send("Unauthorized: Invalid token.");
//     }
// };

// Define the route on the router
apiRouter.get("/asaas/customers", async (req: express.Request, res: express.Response) => {
    try {
        const uid = (req as any).user.uid;

        const settingsRef = admin.firestore().collection("settings").doc(uid);
        const settingsDoc = await settingsRef.get();

        if (!settingsDoc.exists) {
            return res.status(404).send("Settings not found for this user.");
        }

        const asaasToken = settingsDoc.data()?.tokenAsaas;
        if (!asaasToken) {
            return res.status(400).send("Asaas token not configured.");
        }

        const asaasApiUrl = "https://sandbox.asaas.com/api/v3/customers?limit=100";
        const options = {
            headers: {
                "Content-Type": "application/json",
                "access_token": asaasToken,
            },
        };

        const asaasResponse = await axios.get(asaasApiUrl, options);
        
        console.log("Resposta da API Asaas:", asaasResponse.data);

        return res.status(200).json(asaasResponse.data);

    } catch (error) {
        console.error("--- ERROR FETCHING ASAAS CLIENTS ---");
        if (axios.isAxiosError(error)) {
            console.error("Axios Error Details:", error.response?.data);
        }
        return res.status(500).send("Internal Server Error");
    }
});

// Mount the router under the /api path
app.use("/api", apiRouter);

// Export the Express app as a Cloud Function named 'api'
export const api = functions.https.onRequest(app);

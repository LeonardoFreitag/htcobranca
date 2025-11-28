"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.api = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const axios_1 = __importDefault(require("axios"));
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
// Initialize Firebase Admin SDK
admin.initializeApp();
const app = (0, express_1.default)();
// Use CORS middleware. For production, configure it to allow only your app's domain.
app.use((0, cors_1.default)({ origin: true }));
// Create a router for our API
const apiRouter = express_1.default.Router();
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
apiRouter.get("/asaas/customers", async (req, res) => {
    var _a, _b;
    try {
        const uid = req.user.uid;
        const settingsRef = admin.firestore().collection("settings").doc(uid);
        const settingsDoc = await settingsRef.get();
        if (!settingsDoc.exists) {
            return res.status(404).send("Settings not found for this user.");
        }
        const asaasToken = (_a = settingsDoc.data()) === null || _a === void 0 ? void 0 : _a.tokenAsaas;
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
        const asaasResponse = await axios_1.default.get(asaasApiUrl, options);
        console.log("Resposta da API Asaas:", asaasResponse.data);
        return res.status(200).json(asaasResponse.data);
    }
    catch (error) {
        console.error("--- ERROR FETCHING ASAAS CLIENTS ---");
        if (axios_1.default.isAxiosError(error)) {
            console.error("Axios Error Details:", (_b = error.response) === null || _b === void 0 ? void 0 : _b.data);
        }
        return res.status(500).send("Internal Server Error");
    }
});
// Mount the router under the /api path
app.use("/api", apiRouter);
// Export the Express app as a Cloud Function named 'api'
exports.api = functions.https.onRequest(app);
//# sourceMappingURL=index.js.map

import * as functions from "firebase-functions";
import * as functionsV1 from "firebase-functions/v1";
import * as admin from "firebase-admin";
import axios from "axios";
import cors from "cors";
import express from "express";
import { defineSecret } from "firebase-functions/params";
import { FieldValue } from "firebase-admin/firestore";

// --- FIRESTORE PROJECT/EMULATOR DETECTION ---
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || process.env.PROJECT_ID || 'htcobranca-43a32';
const IS_EMULATOR = !!process.env.FIRESTORE_EMULATOR_HOST;
if (IS_EMULATOR) {
    console.log('[Firestore] Using emulator:', process.env.FIRESTORE_EMULATOR_HOST);
    console.log('[Firestore] Project ID:', PROJECT_ID);
} else {
    console.log('[Firestore] Using production project:', PROJECT_ID);
}

// Initialize Firebase Admin SDK with explicit projectId for local dev
admin.initializeApp({
    projectId: PROJECT_ID,
});


const app = express();

// Use CORS middleware. For production, configure it to allow only your app's domain.
app.use(cors({ origin: true }));

// Simple ping endpoint for local emulator health checks (no auth required)
app.get('/ping', (req: express.Request, res: express.Response) => {
    res.status(200).json({ ok: true, ts: Date.now() });
});

// Create a router for our API
const apiRouter = express.Router();

// Middleware to check Firebase Auth token and add the decoded token to req.user
// const authenticate = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
//     // Local dev bypass: if FUNCTIONS_LOCAL or SKIP_AUTH_CHECK is set, accept a provided X-UID header
//     if (process.env.FUNCTIONS_LOCAL === 'true' || process.env.SKIP_AUTH_CHECK === 'true') {
//         const uidFromHeader = (req.headers['x-uid'] as string) || 'local-dev';
//         (req as any).user = { uid: uidFromHeader };
//         return next();
//     }
//     // Accept Authorization: Bearer <idToken>
//     const authHeader = req.headers.authorization || req.headers.Authorization;
//     const idToken = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
//         ? authHeader.split('Bearer ')[1]
//         : undefined;

//     if (!idToken) {
//         res.status(403).send('Unauthorized: No idToken provided.');
//         return;
//     }
//     try {
//         const decodedToken = await admin.auth().verifyIdToken(idToken);
//         (req as any).user = decodedToken; 
//         next();
//     } catch (error) {
//         console.error('Error verifying token:', error);
//         res.status(403).send('Unauthorized: Invalid token.');
//     }
// };

// Helper function to determine Asaas API base URL based on token
const getAsaasBaseUrl = (token: string): string => {
    // Tokens de produção contêm '_prod_', tokens de homologação/sandbox contêm '_hmlg_'
    const isProd = token.includes('_prod_');
    return isProd ? 'https://api.asaas.com' : 'https://api-sandbox.asaas.com';
};

// --- LICENÇA XOR (compatível com TJvXORCipher / JVCL Delphi) ---
// Key idêntica ao componente Delphi: "aabbcccc"
// Decoded (entrada): DD/MM/YYYY  →  Encoded (saída): string de mesmo comprimento
const LICENCA_KEY = "aabbcccc";

function gerarChaveLicenca(dataValidade: Date | string): string {
    let dateStr: string;
    if (typeof dataValidade === "string") {
        // Aceita YYYY-MM-DD e converte para DD/MM/YYYY
        if (/^\d{4}-\d{2}-\d{2}$/.test(dataValidade)) {
            const [y, m, d] = dataValidade.split("-");
            dateStr = `${d}/${m}/${y}`;
        } else {
            dateStr = dataValidade; // assume já está em DD/MM/YYYY
        }
    } else {
        const day = String(dataValidade.getUTCDate()).padStart(2, "0");
        const month = String(dataValidade.getUTCMonth() + 1).padStart(2, "0");
        const year = dataValidade.getUTCFullYear();
        dateStr = `${day}/${month}/${year}`;
    }
    let result = "";
    for (let i = 0; i < dateStr.length; i++) {
        result += String.fromCharCode(dateStr.charCodeAt(i) ^ LICENCA_KEY.charCodeAt(i % LICENCA_KEY.length));
    }
    return result;
}

function decodificarChaveLicenca(chave: string): string {
    let result = "";
    for (let i = 0; i < chave.length; i++) {
        result += String.fromCharCode(chave.charCodeAt(i) ^ LICENCA_KEY.charCodeAt(i % LICENCA_KEY.length));
    }
    return result; // retorna DD/MM/YYYY
}

function addDays(d: Date, days: number): Date {
    const r = new Date(d);
    r.setUTCDate(r.getUTCDate() + days);
    return r;
}

function formatDateISO(d: Date): string {
    return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

async function enviarLicenca(customerId: string, dataValidade: Date | string): Promise<void> {
    const chave = gerarChaveLicenca(dataValidade);
    await axios.post("https://automax.htcode.net/registro", { id: customerId, validade: chave }, {
        headers: { "Content-Type": "application/json" },
        timeout: 10000,
    });
    const dateStr = typeof dataValidade === "string" ? dataValidade : formatDateISO(dataValidade);
    console.log(`[Licença] Enviada: cliente=${customerId}, validade=${dateStr}, chave=${chave}`);
}

async function getSubscriptionNextDueDate(asaasToken: string, subscriptionId: string): Promise<string | null> {
    try {
        const baseUrl = getAsaasBaseUrl(asaasToken);
        const { data } = await axios.get(`${baseUrl}/v3/subscriptions/${subscriptionId}`, {
            headers: { accept: "application/json", access_token: asaasToken },
            timeout: 10000,
        });
        return data.nextDueDate || null;
    } catch {
        return null;
    }
}
// --- FIM helpers de licença ---

// Define the route on the router
// Require authentication for the router
// apiRouter.use(authenticate);

apiRouter.get("/asaas/customers", async (req: express.Request, res: express.Response) => {
    try {
        const { asaasToken } = req.query as { asaasToken?: string };
        if (!asaasToken) {
            return res.status(400).send("Asaas token not provided.");
        }
        // const uid = (req as any).user?.uid;
        // if (!uid) {
        //     return res.status(403).json({ message: 'Unauthorized: Could not determine user from token.' });
        // }

        // // Always use the correct Firestore instance (emulator or prod)
        // const db = admin.firestore();
        // if (IS_EMULATOR) {
        //     db.settings({ host: process.env.FIRESTORE_EMULATOR_HOST, ssl: false });
        // }
        // const settingsRef = db.collection("settings").doc(uid);
        // const settingsDoc = await settingsRef.get();

        // if (!settingsDoc.exists) {
        //     return res.status(404).send("Settings not found for this user.");
        // }

        // const asaasToken = settingsDoc.data()?.tokenAsaas;
        // if (!asaasToken) {
        //     return res.status(400).send("Asaas token not configured.");
        // }

        // console.log(asaasToken);

        // Determina URL base (produção ou sandbox) baseado no token
        const baseUrl = getAsaasBaseUrl(asaasToken);
        const asaasApiUrl = `${baseUrl}/v3/customers?limit=100`;
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
        console.log(error);
        if (axios.isAxiosError(error)) {
            console.error("Axios Error Details:", error.response?.data);
        }
        return res.status(500).send("Internal Server Error");
    }
});

// Create Asaas customer (POST)
apiRouter.post("/asaas/customers", async (req: express.Request, res: express.Response) => {
    try {
        
        //return res.status(200).json('chamou a funcao');

        const {asaasToken} = req.query as { asaasToken?: string };
        if (!asaasToken) {
            return res.status(400).send("Asaas token not configured.");
        }

        // Determina URL base (produção ou sandbox) baseado no token
        const baseUrl = getAsaasBaseUrl(asaasToken);
        const asaasApiUrl = `${baseUrl}/v3/customers`;
        const options = {
            headers: {
                "accept": "application/json",
                "content-type": "application/json",
                "access_token": asaasToken,
            },
        };

        const payload = req.body || {};
        const asaasResponse = await axios.post(asaasApiUrl, payload, options);

        console.log("Asaas customer created:", asaasResponse.data);
        return res.status(asaasResponse.status).json(asaasResponse.data);

    } catch (error) {
        console.error("--- ERROR CREATING ASAAS CUSTOMER ---");
        console.log(error);
        if (axios.isAxiosError(error)) {
            const status = error.response?.status || 500;
            const data = error.response?.data || { message: 'Unknown error from Asaas' };
            return res.status(status).json(data);
        }
        return res.status(500).send("Internal Server Error");
    }
});

// Delete Asaas customer (DELETE)
apiRouter.delete("/asaas/customers/:customerId", async (req: express.Request, res: express.Response) => {
    try {
        const {asaasToken} = req.query as { asaasToken?: string };
        if (!asaasToken) {
            return res.status(400).send("Asaas token not configured.");
        }

        const { customerId } = req.params;
        if (!customerId) {
            return res.status(400).send("Customer ID is required.");
        }

        // Determina URL base (produção ou sandbox) baseado no token
        const baseUrl = getAsaasBaseUrl(asaasToken);
        const asaasApiUrl = `${baseUrl}/v3/customers/${customerId}`;
        const options = {
            headers: {
                "accept": "application/json",
                "access_token": asaasToken,
            },
        };

        const asaasResponse = await axios.delete(asaasApiUrl, options);

        console.log("Asaas customer deleted:", asaasResponse.data);
        return res.status(asaasResponse.status).json(asaasResponse.data);

    } catch (error) {
        console.error("--- ERROR DELETING ASAAS CUSTOMER ---");
        console.log(error);
        if (axios.isAxiosError(error)) {
            const status = error.response?.status || 500;
            const data = error.response?.data || { message: 'Unknown error from Asaas' };
            return res.status(status).json(data);
        }
        return res.status(500).send("Internal Server Error");
    }
});



// Create Asaas subscription (POST)
apiRouter.post("/asaas/subscriptions", async (req: express.Request, res: express.Response) => {
    try {
        const {asaasToken} = req.query as { asaasToken?: string };
        if (!asaasToken) {
            return res.status(400).send("Asaas token not configured.");
        }

        // Determina URL base (produção ou sandbox) baseado no token
        const baseUrl = getAsaasBaseUrl(asaasToken);
        const asaasApiUrl = `${baseUrl}/v3/subscriptions`;
        const options = {
            headers: {
                "accept": "application/json",
                "content-type": "application/json",
                "access_token": asaasToken,
            },
        };

        const payload = req.body || {};
        const asaasResponse = await axios.post(asaasApiUrl, payload, options);

        console.log("Asaas subscription created:", asaasResponse.data);
        return res.status(asaasResponse.status).json(asaasResponse.data);

    } catch (error) {
        console.error("--- ERROR CREATING ASAAS SUBSCRIPTION ---");
        console.log(error);
        if (axios.isAxiosError(error)) {
            const status = error.response?.status || 500;
            const data = error.response?.data || { message: 'Unknown error from Asaas' };
            return res.status(status).json(data);
        }
        return res.status(500).send("Internal Server Error");
    }
});

// Update Asaas subscription (PUT)
apiRouter.put("/asaas/subscriptions/:subscriptionId", async (req: express.Request, res: express.Response) => {
    try {
        const {asaasToken} = req.query as { asaasToken?: string };
        if (!asaasToken) {
            return res.status(400).send("Asaas token not configured.");
        }

        const { subscriptionId } = req.params;
        if (!subscriptionId) {
            return res.status(400).send("Subscription ID is required.");
        }

        const baseUrl = getAsaasBaseUrl(asaasToken);
        const asaasApiUrl = `${baseUrl}/v3/subscriptions/${subscriptionId}`;
        const options = {
            headers: {
                "accept": "application/json",
                "content-type": "application/json",
                "access_token": asaasToken,
            },
        };

        const payload = req.body || {};
        const asaasResponse = await axios.put(asaasApiUrl, payload, options);

        console.log("Asaas subscription updated:", asaasResponse.data);
        return res.status(asaasResponse.status).json(asaasResponse.data);

    } catch (error) {
        console.error("--- ERROR UPDATING ASAAS SUBSCRIPTION ---");
        console.log(error);
        if (axios.isAxiosError(error)) {
            const status = error.response?.status || 500;
            const data = error.response?.data || { message: 'Unknown error from Asaas' };
            return res.status(status).json(data);
        }
        return res.status(500).send("Internal Server Error");
    }
});

// Delete Asaas subscription (DELETE)
apiRouter.delete("/asaas/subscriptions/:subscriptionId", async (req: express.Request, res: express.Response) => {
    try {
        const {asaasToken} = req.query as { asaasToken?: string };
        if (!asaasToken) {
            return res.status(400).send("Asaas token not configured.");
        }

        const { subscriptionId } = req.params;
        if (!subscriptionId) {
            return res.status(400).send("Subscription ID is required.");
        }

        // Determina URL base (produção ou sandbox) baseado no token
        const baseUrl = getAsaasBaseUrl(asaasToken);
        const asaasApiUrl = `${baseUrl}/v3/subscriptions/${subscriptionId}`;
        const options = {
            headers: {
                "accept": "application/json",
                "access_token": asaasToken,
            },
        };

        const asaasResponse = await axios.delete(asaasApiUrl, options);

        console.log("Asaas subscription deleted:", asaasResponse.data);
        return res.status(asaasResponse.status).json(asaasResponse.data);

    } catch (error) {
        console.error("--- ERROR DELETING ASAAS SUBSCRIPTION ---");
        console.log(error);
        if (axios.isAxiosError(error)) {
            const status = error.response?.status || 500;
            const data = error.response?.data || { message: 'Unknown error from Asaas' };
            return res.status(status).json(data);
        }
        return res.status(500).send("Internal Server Error");
    }
});



// List Asaas subscriptions (GET)
apiRouter.get("/asaas/subscriptions", async (req: express.Request, res: express.Response) => {
    try {
        const { asaasToken, limit, offset, customer, status, billingType, externalReference } = req.query as {
            asaasToken?: string;
            limit?: string;
            offset?: string;
            customer?: string;
            status?: string;
            billingType?: string;
            externalReference?: string;
        };

        if (!asaasToken) {
            return res.status(400).send("Asaas token not configured.");
        }

        const baseUrl = `${getAsaasBaseUrl(asaasToken)}/v3/subscriptions`;
        const queryParams = new URLSearchParams();

        if (limit) queryParams.append("limit", limit);
        if (offset) queryParams.append("offset", offset);
        if (customer) queryParams.append("customer", customer);
        if (status) queryParams.append("status", status);
        if (billingType) queryParams.append("billingType", billingType);
        if (externalReference) queryParams.append("externalReference", externalReference);

        const asaasApiUrl = queryParams.toString() ? `${baseUrl}?${queryParams.toString()}` : baseUrl;
        const options = {
            headers: {
                accept: "application/json",
                access_token: asaasToken,
            },
        };

        const asaasResponse = await axios.get(asaasApiUrl, options);
        return res.status(asaasResponse.status).json(asaasResponse.data);
    } catch (error) {
        console.error("--- ERROR LISTING ASAAS SUBSCRIPTIONS ---");
        console.log(error);
        if (axios.isAxiosError(error)) {
            const status = error.response?.status || 500;
            const data = error.response?.data || { message: "Unknown error from Asaas" };
            return res.status(status).json(data);
        }
        return res.status(500).send("Internal Server Error");
    }
});

// List Asaas payments with filters (GET)
apiRouter.get("/asaas/payments", async (req: express.Request, res: express.Response) => {
    try {
        const { asaasToken, ...filters } = req.query as { 
            asaasToken?: string;
            customer?: string;
            billingType?: string;
            status?: string;
            subscription?: string;
            externalReference?: string;
            paymentDate?: string;
            estimatedCreditDate?: string;
            pixQrCodeId?: string;
            anticipated?: string;
            anticipable?: string;
            dateCreatedGe?: string;
            dateCreatedLe?: string;
            dueDateGe?: string;
            dueDateLe?: string;
            paymentDateGe?: string;
            paymentDateLe?: string;
            offset?: string;
            limit?: string;
        };

        if (!asaasToken) {
            return res.status(400).send("Asaas token not configured.");
        }

        // Construir URL com query params
        const baseUrl = `${getAsaasBaseUrl(asaasToken)}/v3/payments`;
        const queryParams = new URLSearchParams();

        // Adicionar filtros fornecidos
        if (filters.customer) queryParams.append('customer', filters.customer);
        if (filters.billingType) queryParams.append('billingType', filters.billingType);
        if (filters.status) queryParams.append('status', filters.status);
        if (filters.subscription) queryParams.append('subscription', filters.subscription);
        if (filters.externalReference) queryParams.append('externalReference', filters.externalReference);
        if (filters.paymentDate) queryParams.append('paymentDate', filters.paymentDate);
        if (filters.estimatedCreditDate) queryParams.append('estimatedCreditDate', filters.estimatedCreditDate);
        if (filters.pixQrCodeId) queryParams.append('pixQrCodeId', filters.pixQrCodeId);
        if (filters.anticipated) queryParams.append('anticipated', filters.anticipated);
        if (filters.anticipable) queryParams.append('anticipable', filters.anticipable);
        
        // Filtros de data com operadores [ge] e [le]
        if (filters.dateCreatedGe) queryParams.append('dateCreated[ge]', filters.dateCreatedGe);
        if (filters.dateCreatedLe) queryParams.append('dateCreated[le]', filters.dateCreatedLe);
        if (filters.dueDateGe) queryParams.append('dueDate[ge]', filters.dueDateGe);
        if (filters.dueDateLe) queryParams.append('dueDate[le]', filters.dueDateLe);
        if (filters.paymentDateGe) queryParams.append('paymentDate[ge]', filters.paymentDateGe);
        if (filters.paymentDateLe) queryParams.append('paymentDate[le]', filters.paymentDateLe);

        // Paginação
        if (filters.offset) queryParams.append('offset', filters.offset);
        if (filters.limit) queryParams.append('limit', filters.limit);

        const asaasApiUrl = `${baseUrl}?${queryParams.toString()}`;

        const options = {
            headers: {
                "accept": "application/json",
                "access_token": asaasToken,
            },
        };

        const asaasResponse = await axios.get(asaasApiUrl, options);

        console.log("Asaas payments listed successfully");
        return res.status(asaasResponse.status).json(asaasResponse.data);

    } catch (error) {
        console.error("--- ERROR LISTING ASAAS PAYMENTS ---");
        console.log(error);
        if (axios.isAxiosError(error)) {
            const status = error.response?.status || 500;
            const data = error.response?.data || { message: 'Unknown error from Asaas' };
            return res.status(status).json(data);
        }
        return res.status(500).send("Internal Server Error");
    }
});

// Mount the router under the root path. The Cloud Function name is `api`, so the final endpoint will be /api/asaas/customers
app.use("/", apiRouter);

// Export the Express app as a Cloud Function named 'api'
// ASAAS_WEBHOOK_TOKEN: usado para validar requisições do webhook Asaas
export const api = functions.https.onRequest({ secrets: ["ASAAS_WEBHOOK_TOKEN"] }, app);
// Export the express `app` for local debugging (so we can run it directly without the emulator)
export const expressApp = app;

// Local debug function to validate function registration in the emulator
export const hello = functions.https.onRequest((req: any, res: any) => {
    res.status(200).json({ message: 'hello from functions emulator', ts: Date.now() });
});

// Reusable job that synchronizes RECEIVED payments from Asaas into Firestore
// async function performAsaasPaymentsSync(asaasToken: string) {
//     const asaasApiUrl = "https://api-sandbox.asaas.com/v3/payments?status=RECEIVED&limit=100";
//     const options = {
//         headers: {
//             accept: "application/json",
//             access_token: asaasToken,
//         },
//     };

//     const { data } = await axios.get(asaasApiUrl, options);
//     const pagamentosRecebidos = data.data || [];

//     const db = admin.firestore();
//     let success = 0;
//     let failed = 0;

//     for (const pagamento of pagamentosRecebidos) {
//         try {
//             await db
//                 .collection("payments")
//                 .doc(pagamento.id)
//                 .set(
//                     {
//                         ...pagamento,
//                         syncedAt: FieldValue.serverTimestamp(),
//                     },
//                     { merge: true }
//                 );
//             success += 1;
//         } catch (err) {
//             console.error(`Erro ao processar pagamento ${pagamento.id}:`, err);
//             failed += 1;
//         }
//     }

//     return { total: pagamentosRecebidos.length, success, failed };
// }

// Helper para buscar pagamentos por status (com paginação)
async function fetchPaymentsByStatus(asaasToken: string, status: string, limit: number = 100): Promise<any[]> {
    const collected: any[] = [];
    let offset = 0;
    const baseUrl = getAsaasBaseUrl(asaasToken);
    while (true) {
        const url = `${baseUrl}/v3/payments?status=${status}&limit=${limit}&offset=${offset}`;
        const options = { headers: { accept: "application/json", access_token: asaasToken } };
        const { data } = await axios.get(url, options);
        const page = data.data || [];
        collected.push(...page);
        if (!data.hasMore || page.length === 0) break;
        offset += limit;
    }
    return collected;
}

// Job para sincronizar títulos em aberto (PENDING, OVERDUE) no Firestore
async function performOpenTitlesSync(asaasToken: string) {
    const statuses = ["PENDING", "OVERDUE"]; // Ajuste se quiser incluir outros
    const db = admin.firestore();
    let total = 0;
    let success = 0;
    let failed = 0;
    for (const status of statuses) {
        try {
            const payments = await fetchPaymentsByStatus(asaasToken, status);
            total += payments.length;
            for (const p of payments) {
                try {
                    await db.collection("payments").doc(p.id).set({
                        ...p,
                        openStatus: status,
                        openSyncedAt: FieldValue.serverTimestamp(),
                    }, { merge: true });
                    success += 1;
                } catch (err) {
                    console.error(`Falha ao salvar pagamento aberto ${p.id}:`, err);
                    failed += 1;
                }
            }
        } catch (err) {
            console.error(`Erro ao buscar pagamentos status ${status}:`, err);
        }
    }
    return { total, success, failed };
}

// Função agendada para sincronizar títulos em aberto (pendentes / vencidos)
export const syncOpenAsaasTitles = functionsV1.pubsub
    .schedule("every 2 hours")
    .timeZone("America/Sao_Paulo")
    .onRun(async () => {
        try {
            console.log("Iniciando sincronização de títulos em aberto (PENDING/OVERDUE)...");
            const ASAAS_KEY = defineSecret("ASAAS_KEY");
            const asaasToken = ASAAS_KEY.value();
            if (!asaasToken) {
                console.error("Segredo ASAAS_KEY não configurado.");
                return null;
            }
            const result = await performOpenTitlesSync(asaasToken);
            console.log(`Open titles sync concluída. Total: ${result.total}, sucesso: ${result.success}, falhas: ${result.failed}.`);
            return null;
        } catch (error) {
            console.error("Erro na sync de títulos em aberto:", error);
            if (axios.isAxiosError(error)) {
                console.error("Detalhes Asaas:", error.response?.data);
            }
            return null;
        }
    });

// ---------------- Verificação individual de títulos abertos ----------------
// Considera documentos em 'payments' com openStatus (PENDING/OVERDUE), consulta no Asaas individualmente,
// se estiver pago, atualiza o Firestore e chama a API externa para atualizar a licença

function isPaidStatus(status: string | undefined): boolean {
    if (!status) return false;
    const paidStatuses = [
        "RECEIVED",
        "RECEIVED_IN_CASH",
        "CONFIRMED",
        "REFUNDED",
        "CHARGEBACK",
    ];
    return paidStatuses.includes(status);
}

// Helper: verifica títulos abertos no Firestore e atualiza se pagos no Asaas
async function performVerifyOpenTitlesUpdate(asaasToken: string) {
    const db = admin.firestore();
    const snapshot = await db
        .collection("payments")
        .where("openStatus", "in", ["PENDING", "OVERDUE"]) // candidatos
        .limit(200)
        .get();

    if (snapshot.empty) {
        return { checked: 0, updated: 0 };
    }

    let checked = 0;
    let updated = 0;
    for (const doc of snapshot.docs) {
        const payment = doc.data();
        const paymentId: string | undefined = payment.id || doc.id;
        if (!paymentId) continue;

        try {
            const baseUrl = getAsaasBaseUrl(asaasToken);
            const url = `${baseUrl}/v3/payments/${paymentId}`;
            const options = { headers: { accept: "application/json", access_token: asaasToken } };
            const { data: asaasPayment } = await axios.get(url, options);
            checked += 1;

            if (isPaidStatus(asaasPayment.status)) {
                const customerId = String(asaasPayment.customer || payment.customer || "");
                const dueDate: string | undefined = asaasPayment.dueDate || payment.dueDate;

                // Busca nextDueDate da assinatura para usar como validade real
                let validadeDate: Date;
                if (asaasPayment.subscription) {
                    const nextDue = await getSubscriptionNextDueDate(asaasToken, asaasPayment.subscription);
                    validadeDate = nextDue ? new Date(nextDue) : addDays(new Date(dueDate || Date.now()), 30);
                } else {
                    validadeDate = addDays(new Date(dueDate || Date.now()), 30);
                }
                const validade = formatDateISO(validadeDate);

                // Atualiza Firestore com status atual do Asaas
                await doc.ref.set(
                    {
                        ...payment,
                        ...asaasPayment,
                        openStatus: FieldValue.delete(),
                        openSyncedAt: FieldValue.delete(),
                        verifiedAt: FieldValue.serverTimestamp(),
                    },
                    { merge: true }
                );
                updated += 1;

                // Gera chave XOR e envia ao AUTOMAX
                try {
                    await enviarLicenca(customerId, validade);
                } catch (err) {
                    console.error(`[Licença] Falha ao enviar para cliente ${customerId}:`, err);
                }
            }
        } catch (err) {
            console.error(`Erro ao consultar pagamento ${paymentId} no Asaas:`, err);
        }
    }

    return { checked, updated };
}

export const verifyOpenTitlesAndUpdate = functionsV1.pubsub
    .schedule("every 2 hours")
    .timeZone("America/Sao_Paulo")
    .onRun(async () => {
        try {
            console.log("Verificando títulos abertos individualmente no Asaas...");
            const ASAAS_KEY = defineSecret("ASAAS_KEY");
            const asaasToken = ASAAS_KEY.value();
            if (!asaasToken) {
                console.error("Segredo ASAAS_KEY não configurado.");
                return null;
            }
            const result = await performVerifyOpenTitlesUpdate(asaasToken);
            console.log(`Verificação concluída. Checados: ${result.checked}, atualizados: ${result.updated}.`);
            return null;
        } catch (error) {
            console.error("Erro na verificação de títulos abertos:", error);
            if (axios.isAxiosError(error)) {
                console.error("Detalhes Asaas:", error.response?.data);
            }
            return null;
        }
    });

// ---------------- Renovação antecipada de licenças ----------------
// Roda diariamente às 7h (Sao_Paulo). Para assinaturas ATIVAS com nextDueDate
// nos próximos DIAS_ANTECIPACAO dias, renova a licença com grace period de 3 dias
// para evitar bloqueio do cliente enquanto o pagamento não é detectado.

const DIAS_ANTECIPACAO = 5;
const GRACE_PERIOD_DIAS = 3;

async function performRenovarLicencasAntecipadas(): Promise<{ verificadas: number; renovadas: number }> {
    const db = admin.firestore();
    const settingsSnap = await db.collection("settings").get();

    let verificadas = 0;
    let renovadas = 0;
    const hoje = new Date();

    for (const settingsDoc of settingsSnap.docs) {
        const asaasToken: string | undefined = settingsDoc.data().tokenAsaas;
        if (!asaasToken) continue;

        const baseUrl = getAsaasBaseUrl(asaasToken);
        let offset = 0;

        // Pagina todas as assinaturas ATIVAS do usuário
        while (true) {
            let subsData: any;
            try {
                const { data } = await axios.get(`${baseUrl}/v3/subscriptions?status=ACTIVE&limit=100&offset=${offset}`, {
                    headers: { accept: "application/json", access_token: asaasToken },
                    timeout: 15000,
                });
                subsData = data;
            } catch (err) {
                console.error(`[RenovaçãoAntecipada] Erro ao listar assinaturas (offset=${offset}):`, err);
                break;
            }

            const subs: any[] = subsData.data || [];
            verificadas += subs.length;

            for (const sub of subs) {
                if (!sub.nextDueDate || !sub.customer) continue;

                const nextDue = new Date(sub.nextDueDate);
                const diffDias = Math.ceil((nextDue.getTime() - hoje.getTime()) / 86400000);

                if (diffDias <= DIAS_ANTECIPACAO) {
                    // Validade = nextDueDate + grace period para dar tempo do pagamento ser processado
                    const validadeDate = addDays(nextDue, GRACE_PERIOD_DIAS);
                    const validade = formatDateISO(validadeDate);
                    try {
                        await enviarLicenca(sub.customer, validade);
                        renovadas++;
                        console.log(`[RenovaçãoAntecipada] cliente=${sub.customer}, nextDue=${sub.nextDueDate}, validadeEnviada=${validade}`);
                    } catch (err) {
                        console.error(`[RenovaçãoAntecipada] Falha ao renovar cliente ${sub.customer}:`, err);
                    }
                }
            }

            if (!subsData.hasMore || subs.length === 0) break;
            offset += 100;
        }
    }

    return { verificadas, renovadas };
}

export const renovarLicencasAntecipadas = functionsV1.pubsub
    .schedule("every 24 hours")
    .timeZone("America/Sao_Paulo")
    .onRun(async () => {
        try {
            console.log("[RenovaçãoAntecipada] Iniciando verificação de assinaturas próximas do vencimento...");
            const result = await performRenovarLicencasAntecipadas();
            console.log(`[RenovaçãoAntecipada] Concluído. Verificadas: ${result.verificadas}, renovadas: ${result.renovadas}.`);
            return null;
        } catch (error) {
            console.error("[RenovaçãoAntecipada] Erro geral:", error);
            return null;
        }
    });

// Endpoint dev para disparar renovação antecipada manualmente
apiRouter.get("/dev/renovar-licencas-antecipadas", async (req: express.Request, res: express.Response) => {
    try {
        const result = await performRenovarLicencasAntecipadas();
        return res.status(200).json({ ok: true, ...result });
    } catch (error) {
        console.error("/dev/renovar-licencas-antecipadas error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
});
// ---------------- Fim renovação antecipada ----------------

// Endpoint dev para disparar a verificação de títulos abertos manualmente
apiRouter.get("/dev/verify-open-titles", async (req: express.Request, res: express.Response) => {
    try {
        const { asaasToken } = req.query as { asaasToken?: string };
        const token = asaasToken || (process.env.ASAAS_KEY as string | undefined);
        if (!token) {
            return res.status(400).json({ message: "Asaas token not provided. Use ?asaasToken=... ou defina env ASAAS_KEY." });
        }
        const result = await performOpenTitlesSync(token);
        return res.status(200).json({ ok: true, ...result });
    } catch (error) {
        console.error("/dev/verify-open-titles error:", error);
        if (axios.isAxiosError(error)) {
            return res.status(500).json({ message: "Asaas error", details: error.response?.data });
        }
        return res.status(500).json({ message: "Internal Server Error" });
    }
});

apiRouter.get("/dev/sync-store-with-asaas", async (req: express.Request, res: express.Response) => {
    try {
        const { asaasToken } = req.query as { asaasToken?: string };
        const token = asaasToken || (process.env.ASAAS_KEY as string | undefined);
        if (!token) {
            return res.status(400).json({ message: "Asaas token not provided. Use ?asaasToken=... ou defina env ASAAS_KEY." });
        }
        const result = await performVerifyOpenTitlesUpdate(token);
        return res.status(200).json({ ok: true, ...result });
    } catch (error) {
        console.error("/dev/verify-open-titles error:", error);
        if (axios.isAxiosError(error)) {
            return res.status(500).json({ message: "Asaas error", details: error.response?.data });
        }
        return res.status(500).json({ message: "Internal Server Error" });
    }
});

// ---------------- Fim verificação individual de títulos abertos ----------------

// aqui preciso de uma função que atualize a chave de licença na api AUTOMAX

// ---------------- Webhook Asaas (notificações em tempo real) ----------------
// Registre esta URL no painel Asaas: Configurações → Notificações → Webhook
// URL: https://<sua-cloud-function-url>/webhooks/asaas
// Eventos recomendados: PAYMENT_RECEIVED, PAYMENT_CONFIRMED

apiRouter.post("/webhooks/asaas", async (req: express.Request, res: express.Response) => {
    try {
        // Valida token de autenticação enviado pelo Asaas no header
        const webhookToken = process.env.ASAAS_WEBHOOK_TOKEN;
        const receivedToken = req.headers["asaas-access-token"];
        if (webhookToken && receivedToken !== webhookToken) {
            console.warn("[Webhook Asaas] Token inválido recebido.");
            return res.status(401).json({ message: "Não autorizado." });
        }

        const { event, payment } = req.body || {};
        console.log(`[Webhook Asaas] Evento recebido: ${event}`);

        if (!event || !payment) {
            return res.status(400).json({ message: "Payload inválido." });
        }

        const paidEvents = ["PAYMENT_RECEIVED", "PAYMENT_CONFIRMED", "PAYMENT_RECEIVED_IN_CASH"];
        if (!paidEvents.includes(event)) {
            // Asaas exige 200 mesmo para eventos ignorados
            return res.status(200).json({ ok: true, message: "Evento ignorado." });
        }

        const customerId: string = payment.customer;
        const subscriptionId: string | undefined = payment.subscription;
        const dueDate: string | undefined = payment.dueDate;

        if (!customerId) {
            return res.status(200).json({ ok: true, message: "Sem customer ID, ignorado." });
        }

        // Busca token Asaas do usuário dono do cliente via Firestore
        const db = admin.firestore();
        let asaasToken: string | undefined;

        const clientsSnap = await db.collection("clients")
            .where("asaasId", "==", customerId)
            .limit(1)
            .get();

        if (!clientsSnap.empty) {
            const userId: string | undefined = clientsSnap.docs[0].data().userId;
            if (userId) {
                const settingsDoc = await db.collection("settings").doc(userId).get();
                asaasToken = settingsDoc.data()?.tokenAsaas;
            }
        }

        // Determina data de validade (nextDueDate da assinatura ou +30 dias)
        let validadeDate: Date;
        if (asaasToken && subscriptionId) {
            const nextDue = await getSubscriptionNextDueDate(asaasToken, subscriptionId);
            validadeDate = nextDue ? new Date(nextDue) : addDays(new Date(dueDate || Date.now()), 30);
        } else {
            validadeDate = dueDate ? addDays(new Date(dueDate), 30) : addDays(new Date(), 30);
        }

        // Gera chave XOR e envia ao AUTOMAX
        await enviarLicenca(customerId, validadeDate);

        // Atualiza pagamento no Firestore
        if (payment.id) {
            await db.collection("payments").doc(payment.id).set({
                ...payment,
                openStatus: FieldValue.delete(),
                openSyncedAt: FieldValue.delete(),
                verifiedAt: FieldValue.serverTimestamp(),
            }, { merge: true });
        }

        console.log(`[Webhook Asaas] Licença processada: cliente=${customerId}, validade=${formatDateISO(validadeDate)}`);
        return res.status(200).json({ ok: true, event, customerId });

    } catch (error) {
        console.error("[Webhook Asaas] Erro:", error);
        // Retorna 200 para evitar que o Asaas reenvie indefinidamente
        return res.status(200).json({ ok: false, message: "Erro interno ao processar evento." });
    }
});
// ---------------- Fim Webhook Asaas ----------------

// ---------------- Endpoints Registro (AUTOMAX) ----------------
const REGISTRO_API_URL = "https://automax.htcode.net/registro";

// Cria/atualiza registro (POST)
// Recebe { id, validade } onde validade é YYYY-MM-DD ou DD/MM/YYYY (data em texto puro).
// A chave XOR é gerada aqui e enviada ao AUTOMAX — o frontend não precisa saber do cipher.
apiRouter.post("/registro", async (req: express.Request, res: express.Response) => {
    try {
        const { id, validade } = req.body || {};
        if (!id || !validade) {
            return res.status(400).json({ message: "Campos obrigatórios ausentes: id e validade." });
        }

        const chave = gerarChaveLicenca(String(validade));
        const response = await axios.post(
            REGISTRO_API_URL,
            { id: String(id), validade: chave },
            { headers: { "Content-Type": "application/json", accept: "application/json" }, timeout: 15000 }
        );

        console.log(`[Registro POST] cliente=${id}, validade=${validade}, chave=${chave}`);
        return res.status(response.status).json(response.data);
    } catch (error) {
        console.error("/registro POST error:", error);
        if (axios.isAxiosError(error)) {
            const status = error.response?.status || 500;
            const data = error.response?.data || { message: "Erro desconhecido da API Registro" };
            return res.status(status).json(data);
        }
        return res.status(500).json({ message: "Internal Server Error" });
    }
});

// Atualiza registro (PATCH)
apiRouter.patch("/registro", async (req: express.Request, res: express.Response) => {
    try {
        const { id, validade } = req.body || {};
        if (!id || !validade) {
            return res.status(400).json({ message: "Campos obrigatórios ausentes: id e validade." });
        }

        const chave = gerarChaveLicenca(String(validade));
        const response = await axios.patch(
            REGISTRO_API_URL,
            { id: String(id), validade: chave },
            { headers: { "Content-Type": "application/json", accept: "application/json" }, timeout: 15000 }
        );

        console.log(`[Registro PATCH] cliente=${id}, validade=${validade}, chave=${chave}`);
        return res.status(response.status).json(response.data);
    } catch (error) {
        console.error("/registro PATCH error:", error);
        if (axios.isAxiosError(error)) {
            const status = error.response?.status || 500;
            const data = error.response?.data || { message: "Erro desconhecido da API Registro" };
            return res.status(status).json(data);
        }
        return res.status(500).json({ message: "Internal Server Error" });
    }
});

// Consulta validade (GET)
// Decodifica a chave XOR recebida do AUTOMAX e retorna também a data legível.
apiRouter.get("/registro", async (req: express.Request, res: express.Response) => {
    try {
        const { id } = req.query as { id?: string };
        if (!id) {
            return res.status(400).json({ message: "Parâmetro obrigatório ausente: id." });
        }

        const response = await axios.get(REGISTRO_API_URL, {
            params: { id },
            headers: { accept: "application/json" },
            timeout: 15000,
        });

        // Decodifica a chave XOR para exibir a data legível ao frontend
        const rawData = response.data || {};
        const chaveArmazenada: string | undefined = rawData.validade;
        const validadeDecodificada = chaveArmazenada ? decodificarChaveLicenca(chaveArmazenada) : undefined;

        return res.status(response.status).json({
            ...rawData,
            validadeDecodificada, // DD/MM/YYYY — data real de validade
        });
    } catch (error) {
        console.error("/registro GET error:", error);
        if (axios.isAxiosError(error)) {
            const status = error.response?.status || 500;
            const data = error.response?.data || { message: "Erro desconhecido da API Registro" };
            return res.status(status).json(data);
        }
        return res.status(500).json({ message: "Internal Server Error" });
    }
});
// ---------------- Fim Endpoints Registro (AUTOMAX) ----------------

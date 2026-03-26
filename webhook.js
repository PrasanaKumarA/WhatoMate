app.use(express.json());
app.post("/webhook", async (req, res) => {
    const body = req.body;

    if (body.object) {
        const entry = body.entry?.[0];
        const changes = entry?.changes?.[0];
        const message = changes?.value?.messages?.[0];

        if (message) {
            const from = message.from; // user number
            const msgText = message.text?.body;

            console.log("Message from:", from);
            console.log("Text:", msgText);

            // 🔥 AUTO REPLY
            await sendMessage(from, "Hello Boss 😎, your message received!");
        }

        res.sendStatus(200);
    } else {
        res.sendStatus(404);
    }
});
const express = require("express");
const app = express();

app.use(express.json());

const axios = require("axios");

const TOKEN = "EAANYb6rgqg4BRBLnCPlKQIwCDFl30ra68XAek6Nas3QUpsZCPF6eARJqeyY3O7eZAgd8Ht4JSWk7Hhsr3NCRFjuHqlrZCHxjn1diGPp1oDiRm5sgzApgdAiNlhtxEN9xIa7JztBD25FpRVQFvGVZBj1KM4mRNSAZComEkljVxloZCb8lwpgPlCjTuCsOZCXKMkpduH0YAZCOUOf6dws05JScprtyMHdJETLWpMxfigwzmB6JHfEKfhDovqdjjOU6kwRQg1Ck9DGVShFc82LmJ0wKZBvwY";
const PHONE_NUMBER_ID = "1104015276119982";

async function sendMessage(to, text) {
    await axios.post(
        `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
        {
            messaging_product: "whatsapp",
            to: to,
            text: { body: text },
        },
        {
            headers: {
                Authorization: `Bearer ${TOKEN}`,
                "Content-Type": "application/json",
            },
        }
    );
}
app.listen(8080, () => {
    console.log("Server is running on port 8080 🚀");
});

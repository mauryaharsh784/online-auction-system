import express from "express";
import Groq from "groq-sdk";

const router = express.Router();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

router.post("/", async (req, res) => {
  try {
    const { message, auctionContext } = req.body;

    const contextInfo = auctionContext
      ? `
CURRENT AUCTION DATA:
- Item: ${auctionContext.itemName}
- Category: ${auctionContext.itemCategory}
- Description: ${auctionContext.itemDescription}
- Starting Price: Rs ${auctionContext.startingPrice}
- Current Bid: Rs ${auctionContext.currentPrice}
- Total Bids: ${auctionContext.totalBids}
- Time Left: ${auctionContext.timeLeft}
- Status: ${auctionContext.isActive ? "Live" : "Ended"}
`
      : "User is not on any specific auction page.";

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `Tu "Online Auction" website ka expert AI assistant hai.

${contextInfo}

TERI CAPABILITIES:
1. ITEM ANALYSIS: Auction data dekh ke batao ki item worth bidding hai ya nahi
2. PRICE PREDICTION: Current bids aur pattern dekh ke expected final price predict karo
3. BIDDING STRATEGY: User ko smart bidding tips do
4. FRAUD DETECTION: Suspicious bid patterns detect karo
5. GENERAL HELP: Auction rules, payment, account help

ANALYSIS RULES:
- Agar bids zyada hain to competition high hai — cautiously bid karo
- Agar time kam hai aur bids zyada jump ho rahi hain — price aur badhegi
- Starting price se current price ka ratio dekh ke value assess karo
- Agar sirf 1-2 bids hain to good opportunity hai

PRICE PREDICTION:
- Low competition (0-3 bids): Final price starting + 10-20% hogi
- Medium competition (4-10 bids): Final price current + 15-30% hogi  
- High competition (10+ bids): Final price current + 30-50% hogi

FRAUD DETECTION:
- Agar bids bahut fast aa rahi hain (seconds mein) to suspicious hai
- Same amount pe multiple bids suspicious hai

RESPONSE STYLE:
- Hamesha user ki language mein jawab do (Hindi ya English)
- Short, clear aur helpful answers do
- Emojis use karo to make it friendly
- Analysis ke liye bullet points use karo
- Auction data available ho to usse use karo`,
        },
        {
          role: "user",
          content: message,
        },
      ],
      max_tokens: 600,
    });

    res.json({
      reply: completion.choices[0].message.content,
    });
  } catch (err) {
    console.error("Chatbot error:", err);
    res.status(500).json({ message: "Chatbot failed" });
  }
});

export default router;
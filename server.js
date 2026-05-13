const express = require('express');
const Stripe = require('stripe');
const { v4: uuidv4 } = require('uuid');
const app = express();

// Stripe keys will be securely pulled from your hosting dashboard settings
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
const DOMAIN = 'run.place'; 

app.use(express.json());

// 1. THE FRONTEND HOME PAGE (HTML UI)
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Set Sail Retail - Dice Game</title>
        <style>
            body { font-family: Arial; text-align: center; padding: 50px; background: #f4f7f6; }
            .card { background: white; padding: 30px; border-radius: 8px; display: inline-block; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            button { background: #28a745; color: white; border: none; padding: 12px 24px; font-size: 18px; border-radius: 4px; cursor: pointer; }
        </style>
    </head>
    <body>
        <div class="card">
            <h1>Set Sail Retail Dice Game</h1>
            <p>Cost to play: $1.00</p>
            <p>Roll a <b>6</b> to get a full refund plus $0.10 profit ($1.10 total)!</p>
            
            <form action="/create-checkout-session" method="POST">
                <button type="submit">Purchase & Roll Dice</button>
            </form>
            
            <h2 id="msg"></h2>
        </div>
        <script>
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('result') === 'win') {
                document.getElementById('msg').innerText = "🎲 You rolled a 6! You WON! Check your balance.";
                document.getElementById('msg').style.color = "green";
            } else if (urlParams.get('result') === 'lose') {
                document.getElementById('msg').innerText = "🎲 You rolled a losing number. Try again!";
                document.getElementById('msg').style.color = "red";
            }
        </script>
    </body>
    </html>
  `);
});

// 2. STRIPE CHECKOUT ROUTE (When they click the button)
app.post('/create-checkout-session', async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: 'Set Sail Retail Dice Roll Purchase' },
          unit_amount: 100, // $1.00 in cents
        },
        quantity: 1,
      }],
      mode: 'payment',
      // The game determines the win/loss after they pay
      success_url: `${DOMAIN}/process-game?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${DOMAIN}?payment=canceled`,
    });
    res.redirect(303, session.url);
  } catch (err) {
    res.status(500).send("Stripe error: " + err.message);
  }
});

// 3. SECURE DICE ROLL GAME LOGIC
app.get('/process-game', async (req, res) => {
  const { session_id } = req.query;
  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (session.payment_status === 'paid') {
      
      // Execute the random dice roll securely on the server side
      const roll = Math.floor(Math.random() * 6) + 1;
      
      if (roll === 6) {
        // Issue $1.10 transfer or balance credit here via Stripe API
        return res.redirect('/?result=win');
      } else {
        return res.redirect('/?result=lose');
      }
    }
    res.redirect('/');
  } catch (err) {
    res.send("Error processing game.");
  }
});

app.listen(80, () => console.log('Server running on port 80'));

const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5000;
require('dotenv').config();
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.9ri7q.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  console.log(authHeader);
  if (!authHeader) {
    return res.status(401).send({ message: 'Unauthorized Access' });
  }

  const token = authHeader.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: 'Forbidden Access' });
    }

    req.decoded = decoded;
    next();
  });

}


async function run() {
  try {
    await client.connect();
    console.log("partsDb connected...")
    const partsCollection = client.db("partsDB").collection("parts");
    const ordersCollection = client.db("partsDB").collection("orders");
    const reviewsCollection = client.db("partsDB").collection("reviews");
    const usersCollection = client.db("partsDB").collection("users");
    const paymentsCollection = client.db("partsDB").collection('payments');


    //set the loggedin or signup user in users collection 
    app.put('/user/:email', async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };

      const updateDoc = {
        $set: user
      };
      const result = await usersCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET);
      res.send({ result, token });
    })

    const verifyAdmin = async (req, res, next) => {
      const requesterEmail = req.decoded.email;
      const requesterAccount = await usersCollection.findOne({ email: requesterEmail });

      if (requesterAccount.role === 'admin') {
        next();
      } else {
        res.status(403).send({ message: 'forbidden access' })
      }
    }

    // get all the users 
    app.get('/users', verifyJWT, verifyAdmin, async (req, res) => {
      const query = {};
      const cursor = usersCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    })


    // get a single user info 
    app.get('/user/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const part = await usersCollection.findOne(query);
      res.send(part);
    })

    // get all the parts api 
    app.get('/parts', async (req, res) => {
      const query = {}
      const cursor = partsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    })

    // add a part 
    app.post('/part', verifyJWT, verifyAdmin, async (req, res) => {
      const newPart = req.body;
      const result = await partsCollection.insertOne(newPart);
      res.send(result);
    })


    // get a single part 
    app.get('/part/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const part = await partsCollection.findOne(query);
      res.send(part);
    })

    // delete a part 

    app.delete('/part/:id', verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await partsCollection.deleteOne(query);
      res.send(result);
    })

    // post the order 
    app.post('/order', async (req, res) => {
      const newOrder = req.body;
      const result = await ordersCollection.insertOne(newOrder);
      res.send(result);
    })


    // get all the orders 
    app.get('/orders', verifyJWT, verifyAdmin, async (req, res) => {
      const query = {};
      const cursor = ordersCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    })



    // get the individual persons orders 
    app.get('/myorders', verifyJWT, async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const cursor = ordersCollection.find(query)
      const orders = await cursor.toArray();
      res.send(orders);
    })

    // delete a single order 
    app.delete('/order/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await ordersCollection.deleteOne(query);
      res.send(result);
    })

    // Review apis 

    // Add a review 
    app.post('/addreview', verifyJWT, async (req, res) => {
      const review = req.body;
      const result = await reviewsCollection.insertOne(review);
      res.send(result);
    })

    //get all reviews
    app.get('/reviews', async (req, res) => {
      const query = {};
      const cursor = reviewsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    })

    // admin related apis 
    // check if user is admin by get method 
    app.get('/admin/:email', async (req, res) => {
      const email = req.params.email;
      const user = await usersCollection.findOne({ email: email });
      const isAdmin = user.role === 'admin';
      res.send({ admin: isAdmin });
    })

    // make a role as admin 
    app.put('/user/admin/:email', async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const updateDoc = {
        $set: { role: 'admin' }
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);

    })

    // payment related apis 
    //get the specific order infos
    app.get('/order/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const order = await ordersCollection.findOne(query);
      res.send(order);
    })

    app.post('/create-payment-intent', async (req, res) => {
      const { totalPrice } = req.body;
      const amount = totalPrice * 100;

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      })

      res.send({
        clientSecret: paymentIntent.client_secret,
      })
    })

    app.patch('/order/:id', async (req, res) => {
      const id = req.params.id;
      const payment = req.body;
      const filter = { _id: ObjectId(id) };

      const updatedDoc = {
        $set: {
          paid: true,
          transactionId: payment.transactionId,
          status: payment.status
        }
      }
      const result = await paymentsCollection.insertOne(payment);
      const updatedBooking = await ordersCollection.updateOne(filter, updatedDoc);
      res.send(updatedDoc);
    })

    // update the status to shipped 
    app.put('/order/shipment/:id', async (req, res) => {
      const id = req.params.id;
      const updatedStatus = req.body;
      // console.log(updatedStatus);
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };

      const updateDoc = {
        $set: {
          status: updatedStatus.status
        }
      }

      const result = await ordersCollection.updateOne(filter, updateDoc, options);
      res.send(result);

    })




  } finally {

  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send(' Manufacturer website server running...');
})

app.listen(port, () => {
  console.log('listening to port', port);
})

const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5000;
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

app.use(cors());
app.use(express.json());


const uri = "mongodb+srv://parts_user:HSwcnx6mJhINi5wX@cluster0.9ri7q.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function run() {
  try {
    await client.connect();
    console.log("partsDb connected...")
    const partsCollection = client.db("partsDB").collection("parts");
    const ordersCollection = client.db("partsDB").collection("orders");
    const reviewsCollection = client.db("partsDB").collection("reviews");
    const usersCollection = client.db("partsDB").collection("users");

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
      res.send(result);
    })

    // get all the users 
    app.get('/users', async (req, res) => {
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
    app.post('/part', async (req, res) => {
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

    // post the order 
    app.post('/order', async (req, res) => {
      const newOrder = req.body;
      const result = await ordersCollection.insertOne(newOrder);
      res.send(result);
    })

    // get the individual persons orders 
    app.get('/myorders', async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const cursor = ordersCollection.find(query);
      const orders = await cursor.toArray();
      return res.send(orders);
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
    app.post('/addreview', async (req, res) => {
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

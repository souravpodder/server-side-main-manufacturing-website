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

    // get all the parts api 
    app.get('/parts', async (req, res) => {
      const query = {}
      const cursor = partsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    })

    // get a single part 
    app.get('/part/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const part = await partsCollection.findOne(query);
      res.send(part);
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

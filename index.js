require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorized access" });
  }
  const token = authorization.split(" ")[0];
  jwt.verify(token, process.env.JSON_ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .send({ error: true, message: "unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.tjdcdj5.mongodb.net/?retryWrites=true&w=majority`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const usersCollection = client.db("languageAcademyDB").collection("users");
    const bookingsCollection = client
      .db("languageAcademyDB")
      .collection("bookings");
    const classesCollection = client
      .db("languageAcademyDB")
      .collection("classes");
    // jwt token create
    app.post("/jwt", (req, res) => {
      const email = req.body;
      // console.log(email);
      const token = jwt.sign(email, process.env.JSON_ACCESS_TOKEN, {
        expiresIn: "1h",
      });
      // console.log(token);
      res.send({ token });
    });

    // add class bookmark
    app.post("/book-class", async (req, res) => {
      const doc = req.body;
      const result = await bookingsCollection.insertOne(doc);
      res.send(result);
    });
    // delete class to  bookmark
    app.delete("/delete-book/:id", async (req, res) => {
      const query = { _id: new ObjectId(req.params.id) };
      console.log(query);
      const result = await bookingsCollection.deleteOne(query);
      console.log(result)
      res.send(result);
    });

    // get all class bookmark
    app.get("/book-class/:email", async (req, res) => {
      const query = { instructor_email: req.params.email };
      const result = await bookingsCollection.find(query).toArray();
      res.send(result);
    });

    // get all class list
    app.get("/all-class/", async (req, res) => {
      const result = await classesCollection.find().toArray();
      res.send(result);
    });

    // get instructor class
    app.get("/my-class/:email", async (req, res) => {
      const email = req.params.email;
      const query = { instructor_email: email };
      const result = await classesCollection.find(query).toArray();
      res.send(result);
    });

    // get instructor class updates
    app.put("/update-class/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const body = req.body;
      console.log(body);
      const query = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: body,
      };
      const result = await classesCollection.updateOne(
        query,
        updatedDoc,
        options
      );
      res.send(result);
    });

    // upload class
    app.post("/add-class", async (req, res) => {
      const doc = req.body;
      const result = await classesCollection.insertOne(doc);
      res.send(result);
    });
    // get all classes
    app.get("/all-class", async (req, res) => {
      const result = await classesCollection.find().toArray();
      res.send(result);
    });

    // user collection updates and add
    app.patch("/users/:email", async (req, res) => {
      const email = req.params.email;
      const userInformation = req.body;
      const query = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: userInformation,
      };
      const result = await usersCollection.updateOne(query, updateDoc, options);
      res.send(result);
    });

    // get single user for role
    app.get("/user/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await usersCollection.findOne(query);
      res.send(result);
    });

    // get all users collection
    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });
    // get instructor collection

    app.get("/instructors", async (req, res) => {
      const query = { role: "instructor" };
      const result = await usersCollection.find(query).toArray();
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

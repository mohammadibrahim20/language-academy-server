require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { default: Stripe } = require("stripe");
const app = express();
const port = process.env.PORT || 5000;
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);

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
        expiresIn: "7d",
      });
      // console.log(token);
      res.send({ token });
    });

    // strype payment
    /*     app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      console.log(price)
      const amount = parseFloat(price) * 100;
      if (!price) return;
      const paymentIntent = stripe.paymentIntent.create({
        amount: amount,
        currency: "USD",
        payment_method_type: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.clientSecret,
      });
    }); */

    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseFloat(price * 100);
      if (!price) return;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    // stripe booking success api

    // update bookings for guest
    app.patch("/booking/update/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      // console.log(query);
      const booking = req.body;
      const options = { upsert: true };
      const updateDoc = {
        $set: { ...booking },
      };
      const result = await bookingsCollection.updateOne(
        query,
        updateDoc,
        options
      );
      res.send(result);
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
      const result = await bookingsCollection.deleteOne(query);
      res.send(result);
    });

    // get all class payment for students
    app.get("/payment-history/:email", async (req, res) => {
      const query = {
        student_Email: req.params.email,
        date: { $exists: true },
      };
      const result = await bookingsCollection
        .find(query)
        .sort({ date: -1 })
        .toArray();
      res.send(result);
    });
    // get all class bookmark for students
    app.get("/my-class/:email", async (req, res) => {
      const query = { student_Email: req.params.email };
      const result = await bookingsCollection.find(query).toArray();
      res.send(result);
    });

    // get all class bookmark for insturctor
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

    // update class enrollded count
    app.put("/enrolled/:id", async (req, res) => {
      const query = { _id: new ObjectId(req.params.id) };

      const doc = await classesCollection.findOne(query);
      let seat_capacity = doc.seat_capacity;
      let enrolled = doc.enrolled;
      if (seat_capacity > 1) {
        return res.send({ error: true, seat_capacity: "full" });
      }
      enrolled += 1;
      seat_capacity -= 1;
      const updateDoc = {
        $set: {
          enrolled: enrolled,
          seat_capacity: seat_capacity,
        },
      };
      const options = { upsert: true };
      const result = await classesCollection.updateOne(
        query,
        updateDoc,
        options
      );
      console.log(result)
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
      const body = req.body;
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

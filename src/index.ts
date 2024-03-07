import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";

async function connect_db() {
  const connectionString = process.env.ATLAS_URI || "";
  const client = new MongoClient(connectionString);
  let conn = await client.connect();
  console.log("DB connected");
  const db = client.db("parking");
  return db;
}

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.send("Express + TypeScript Server");
});

app.post("/api/ParkingLots", async (req, res) => {
  try {
    console.log;
    const { id, capacity } = req.body;
    if (!id || !capacity) {
      res.status(400).json({ message: "Missing data" });
      return;
    }
    if(id.length < 24){
      res.status(400).json({ message: "Invalid id length" });
      return;
    }
    if (capacity > 2000 || capacity < 0) {
      res.status(400).json({ message: "Invalid capacity" });
      return;
    }
    const db = await connect_db();
    let collection = await db.collection("lot");
    let results = await collection.insertOne({
      id,
      capacity,
      isActive: true,
    });
    res
      .send({
        isSuccess: true,
        response: {
          id,
          capacity,
          isActive: true,
        },
      })
      .status(200);
  } catch (error) {
    res.send(error).status(500);
  }
});

app.post("/api/Parkings", async (req, res) => {
  try {
    const { parkingLotId, registrationNumber, color } = req.body;
    if (!parkingLotId || !registrationNumber || !color) {
      res.status(400).json({ message: "Missing input data" });
      return;
    }
    const db = await connect_db();
    let lot_collection = await db.collection("lot");
    const lot = await lot_collection.findOne({ id: parkingLotId });
    if (!lot) {
      res.status(400).json({ message: "Parking lot not found" });
      return;
    }
    let collection = await db.collection("parking");
    let parked_cars =
      (await collection.find({ parkingLotId, status: "PARKED" }).count()) + 1;
    let results = await collection.insertOne({
      parkingLotId,
      registrationNumber,
      color,
      slotNumber: parked_cars,
      status: "PARKED",
    });
    res
      .send({
        isSuccess: true,
        response: {
          slotNumber: parked_cars,
          status: "PARKED",
        },
      })
      .status(200);
  } catch (error) {
    res.send(error).status(500);
  }
});

app.delete("/api/Parkings", async (req, res) => {
  try {
    const { parkingLotId, registrationNumber } = req.body;
    if (!parkingLotId || !registrationNumber) {
      res.status(400).json({ message: "Missing input data" });
      return;
    }
    const db = await connect_db();
    let collection = db.collection("parking");
    let parked_car = await collection.findOne({
      parkingLotId,
      registrationNumber,
    });

    if (parked_car == null) {
      res.status(400).json({ message: "Missing car" });
      return;
    }

    let result = await collection.updateOne(
      {
        parkingLotId,
        registrationNumber,
      },
      {
        $set: { status: "LEFT" },
      }
    );

    console.log(parkingLotId, registrationNumber);

    console.log(result);
    res
      .send({
        isSuccess: true,
        response: {
          slotNumber: parked_car.slotNumber,
          registrationNumber: parked_car.registrationNumber,
          status: "LEFT",
        },
      })
      .status(200);
  } catch (error) {
    res.send(error).status(500);
  }
});

app.get("/api/Parkings", async (req, res) => {
  try {
    console.log(req.query)
    const { color, parkingLotId } = req.query;
    
    if (!parkingLotId || !color) {
      res.status(400).json({ message: "Missing input params" });
      return;
    }
    const db = await connect_db();
    let collection = db.collection("parking");

    // find all cars  in the specified parking lot and of the given color
    const results = await collection.find({
      parkingLotId,
      color
    }).toArray();

    const cars = results.map(r => ({ color: r.color, registrationNumber: r.registrationNumber }));
  
    res
      .send({
        isSuccess: true,
        response: {
          registrations: cars,
        },
      })
      .status(200);
  } catch (error) {
    res.send(error).status(500);
  }
});

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});

connect_db();

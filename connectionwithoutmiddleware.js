const express = require("express");
const { MongoClient } = require("mongodb");

const app = express();
const port = 3000;

const url = "mongodb://localhost:27017";
const namaDatabase = "database";
const namaKoleksi = "pengguna";

let collection;

async function connection() {
  try {
    const client = new MongoClient(url);
    await client.connect();
    console.log("Koneksi ke MongoDB berhasil");
    collection = client.db(namaDatabase).collection(namaKoleksi);

    // Membuat index pada email field
    // await collection.createIndex({ email: 1 });
    // console.log("Index pada 'email' berhasil dibuat");
  } catch (error) {
    console.log("Koneksi MongoDB gagal", error);
  }
}

// Endpoint untuk mendapatkan semua data
app.get("/", async (req, res) => {
  try {
    if (!collection) {
      await connection();
    }
    const dataAPI = await collection.find().toArray();
    res.status(200).json(dataAPI);
  } catch (error) {
    console.log("Error:", error);
    res.status(500).json({ error: "Terjadi kesalahan data" });
  }
});

// Endpoint untuk menjalankan aggregation
app.get("/aggregation", async (req, res) => {
  // Pipeline aggregation
  const aggregationResult = await collection
    .aggregate([
      {
        $group: {
          _id: "$alamat", // Mengelompokkan berdasarkan alamat
          totalUsers: { $sum: 1 }, // Menghitung jumlah pengguna per alamat
        },
      },
      {
        $sort: { totalUsers: -1 }, // Mengurutkan berdasarkan total pengguna (descending)
      },
    ])
    .toArray();

  res.status(200).json(aggregationResult);
});

// Endpoint untuk menjalankan bulk operations
app.get("/bulk", async (req, res) => {
  try {
    if (!collection) {
      await connection();
    }

    // Melakukan bulk operation: insert, update, dan delete
    const bulkOps = [
      {
        insertOne: {
          document: {
            nama: "User1",
            email: "user1@gmail.com",
            alamat: "Alamat1",
          },
        },
      },
      {
        insertOne: {
          document: {
            nama: "User2",
            email: "user2@gmail.com",
            alamat: "Alamat2",
          },
        },
      },
      {
        updateOne: {
          filter: { email: "user1@gmail.com" },
          update: { $set: { alamat: "Alamat Baru" } },
        },
      },
      { deleteOne: { filter: { email: "user2@gmail.com" } } },
    ];

    const bulkResult = await collection.bulkWrite(bulkOps);
    res.status(200).json(bulkResult);
  } catch (error) {
    console.log("Error:", error);
    res.status(500).json({ error: "Terjadi kesalahan pada bulk operations" });
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

const express = require("express");
const { MongoClient } = require("mongodb");

require("dotenv").config(); // Load environment variables

const app = express();

// Mengambil konfigurasi dari environment variables
const port = process.env.PORT || 3000;
const url = process.env.MONGODB_URL;
const namaDatabase = process.env.DB_NAME;
const namaKoleksi = process.env.COLLECTION_NAME;

let collection;

// Middleware untuk logging
const logger = (req, res, next) => {
  console.log(`${req.method} ${req.url} - ${new Date().toLocaleTimeString()}`);
  next(); // lanjutkan ke middleware berikutnya atau route
};

// Middleware untuk memastikan koneksi ke MongoDB
const mongoConnectionMiddleware = async (req, res, next) => {
  try {
    if (!collection) {
      const client = new MongoClient(url);
      await client.connect();
      console.log("Koneksi ke MongoDB berhasil");
      collection = client.db(namaDatabase).collection(namaKoleksi);

      // Membuat index pada email field
      // await collection.createIndex({ email: 1 });
      // console.log("Index pada 'email' berhasil dibuat");
    }
    next(); // Lanjutkan ke route handler berikutnya
  } catch (error) {
    console.log("Koneksi MongoDB gagal", error);
    res.status(500).json({ error: "Terjadi kesalahan koneksi ke database" });
  }
};

// Middleware untuk error handling (dipanggil setelah semua route)
const errorHandlingMiddleware = (err, req, res, next) => {
  console.error("Error:", err.stack);
  res.status(500).send("Terjadi kesalahan di server");
};

// Gunakan middleware di aplikasi
app.use(logger); // untuk semua request
app.use(mongoConnectionMiddleware); // pastikan MongoDB sudah terkoneksi

// Endpoint untuk mendapatkan semua data
app.get("/", async (req, res) => {
  try {
    const dataAPI = await collection.find().toArray();
    res.status(200).json(dataAPI);
  } catch (error) {
    console.log("Error:", error);
    res.status(500).json({ error: "Terjadi kesalahan data" });
  }
});

// Endpoint untuk menjalankan aggregation
app.get("/aggregation", async (req, res) => {
  try {
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
  } catch (error) {
    console.log("Error:", error);
    res.status(500).json({ error: "Terjadi kesalahan saat aggregation" });
  }
});

// Endpoint untuk menjalankan bulk operations
app.get("/bulk", async (req, res) => {
  try {
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

// Error handling middleware
app.use(errorHandlingMiddleware);

app.listen(port, () => {
  console.log(`Server berjalan di port http://localhost:${port}`);
});

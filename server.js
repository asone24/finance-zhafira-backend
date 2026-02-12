const express = require("express");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

app.get("/", (req, res) => {
  res.send("Finance Zhafira Backend Running");
});

// Test koneksi database
app.get("/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===============================
// INIT DATABASE TABLES
// ===============================
app.get("/init-db", async (req, res) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS accounts (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        type VARCHAR(50) NOT NULL
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        description TEXT,
        amount NUMERIC NOT NULL,
        type VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(50),
        address TEXT
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        price NUMERIC NOT NULL,
        stock INTEGER DEFAULT 0
      );
    `);

    res.send("Database Initialized Successfully");
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Tambah transaksi
app.post("/transactions", async (req, res) => {
  try {
    const { description, amount, type } = req.body;

    if (!description || !amount || !type) {
      return res.status(400).json({ error: "All fields are required" });
    }

    if (!["income", "expense"].includes(type)) {
      return res.status(400).json({ error: "Type must be income or expense" });
    }

    const result = await pool.query(
      "INSERT INTO transactions (description, amount, type) VALUES ($1, $2, $3) RETURNING *",
      [description, amount, type]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ambil semua transaksi
app.get("/transactions", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM transactions ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Laporan keuangan summary
app.get("/report/summary", async (req, res) => {
  try {
    const incomeResult = await pool.query(
      "SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE type = 'income'"
    );

    const expenseResult = await pool.query(
      "SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE type = 'expense'"
    );

    const totalIncome = parseFloat(incomeResult.rows[0].total);
    const totalExpense = parseFloat(expenseResult.rows[0].total);
    const netProfit = totalIncome - totalExpense;

    res.json({
      total_income: totalIncome,
      total_expense: totalExpense,
      net_profit: netProfit
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

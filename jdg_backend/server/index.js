// server/index.js
const express = require("express");
const fs = require('fs');
const { exit } = require("process");
const path = require("path");
const { Pool } = require('pg')

const PORT = process.env.PORT || 3001;
const CREDS_PATH = path.join(path.dirname(__dirname), "creds.json");
const REQUIRED_CREDS = ["username", "password", "database", "server", "port", "base_path"];

let creds = {};
try {
    let rawdata = fs.readFileSync(CREDS_PATH);
    creds = JSON.parse(rawdata);
} catch (err) {
    console.error("Could not find credentials file!");
    exit(1);
} 

let missing_creds = false;

for (let i = 0; i < REQUIRED_CREDS.length; i++) {
    if (!(REQUIRED_CREDS[i] in creds)) {
        console.error("Credentials file missing required property : %s", REQUIRED_CREDS[i]);
        missing_creds = true;
    }
}

if (missing_creds) {
    exit(1);
}

// Constant table and view paths.
const BASE_PATH = creds["base_path"];
const TURN_EXTRAS_FULL = BASE_PATH + ".\"turn_extras_full\"";
const PLAYERS = BASE_PATH + ".\"players\""


console.log("Connecting to SQL...");

const pool = new Pool({
    user: creds["username"],
    host: creds["server"],
    database: creds["database"],
    password: creds["password"],
    port: creds["port"],
});

const app = express();

app.get("/api", (req, res) => {
    res.json({message: "Hello From Server!"});
});

// Single Game, Per Turn Stats:
// bet - bet amount.
// earned - earned amount.
// bp - base points earned.
// ep - extra points earned.
// gp - game points after turn is complete.
// place - place after turn is complete.
//
// What about rolling stats???
// Total bet up until this turn...
// We need to differ between rolling stats and full game aggregates???
// 
// 
// 
// Can turn stats graduate into full season stats??
// Max, Min, Avg, Sum, Final
// With use of these aggregates!!!
// Graph Equations!


// Total points will return the total points of each player.
// Data will be in the form [{"games_passed" : int, "Josh" : int, ...}, ...].
app.get("/api/pts_chr", async (req, res) => {
    try {
        data = await pool.query(`SELECT * FROM ${PLAYERS};`);
        res.json({errors: [], data: {rows: data.rows}});
    } catch (err) {
        console.log(err);
        res.json({errors: ["SQL Error"]});
    }
});

app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
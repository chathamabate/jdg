// server/index.js
const express = require("express");
const fs = require('fs');
const { exit } = require("process");
const path = require("path");
const { Pool } = require('pg')

const PORT = process.env.PORT || 3001;
const CREDS_PATH = path.join(path.dirname(__dirname), "creds.json");
const REQUIRED_CREDS = ["username", "password", "database", "server", "port",
                        "players", "games", "rosters", "turns"];

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

console.log("Connecting to SQL...");

const pool = new Pool({
    user: creds["username"],
    host: creds["server"],
    database: creds["database"],
    password: creds["password"],
    port: creds["port"],
});


// pool.query(`SELECT * FROM bleh;`)
//     .then(res => console.log(res.rows))
//     .catch(e => {
//         console.error("Error with SQL!");
//         pool.end().finally(() => exit(1));
//     });


const app = express();

app.get("/api", (req, res) => {
    res.json({message: "Hello From Server!"});
});

// Total points will return the total points of each player.
// Data will be in the form [{"games_passed" : int, "Josh" : int, ...}, ...].
app.get("/api/total_points", async (req, res) => {
    

});

app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
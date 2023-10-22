const mysql = require("mysql");

// create a new MySQL connection
const connection = mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE,
});

// connect to the MySQL database
function test() {
    connection.connect((error) => {
        if (error) {
            console.error("Error connecting to MySQL database:", error);
        } else {
            console.log("Connected to MySQL database!");
        }
    });
}

module.exports = { connection, test };

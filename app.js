const express = require("express");
const path = require("path");
const dotenv = require("dotenv");
const bcrypt = require("bcrypt");
const session = require("express-session");
const FileStore = require("session-file-store")(session);
const app = express();
// server settings
const PORT = 2000;
dotenv.config({ path: "./.env" });
const fileStoreOptions = {};
app.use(
    session({
        store: new FileStore(fileStoreOptions),
        secret: process.env.SECRET,
        resave: true,
        saveUninitialized: false,
    })
);
app.set("view engine", "hbs");
const publicDirectory = path.join(__dirname, "./public");
app.use(express.static(publicDirectory));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
// constants
const CHECK_IF_USER_EXISTS_SQL = "SELECT name FROM users WHERE name = ? ";

// routing
app.get("/", (req, res) => {
    res.render("index");
});

app.get("/register", (req, res) => {
    res.render("register");
});

app.get("/dashboard", (req, res) => {
    if (!req.session.isAuth) {
        res.render("register");
        return;
    }
    res.render("dashboard", { account_name: req.session.accountName });
});

app.get("/login", (req, res) => {
    res.render("login");
})

app.post("/auth/register", (req, res) => {
    register(req, res);
});

app.post("/auth/login", (req, res) => {
    login(req,res);
});

app.listen(
    PORT,
    console.log(
        `Server running on http://localhost:${PORT} time: ${new Date().getHours()}:${new Date().getMinutes()}:${new Date().getSeconds()}`
    )
);

// utils
function login(req, res) {
    const { name, password } = req.body;
    const db = require("./dbconnection");
    const conn = db.connection;
    conn.query(CHECK_IF_USER_EXISTS_SQL, [name], async (error, results) => {
        if (error) {
            console.log(
                `Error happened from auth_controller script -> ${error}\nData sent: ${name}`
            );
            return res.render("register", {
                message: "An error happened",
            });
        }
        if (results.length <= 0) {
            return res.render("register", {
                message: "Wrong credentials",
            });
        }
        let hashedPass = await bcrypt.hash(password, 8);
        await checkPassword(name, hashedPass, conn);
        modifyCookie(req, res, name);
    });
}

function register(req, res) {
    const { name, password } = req.body;
    const db = require("./dbconnection");
    const conn = db.connection;
    conn.query(CHECK_IF_USER_EXISTS_SQL, [name], async (error, results) => {
        if (error) {
            console.log(
                `Error happened from auth_controller script -> ${error}\nData sent: ${name}`
            );
            return res.render("register", {
                message: "An error happened",
            });
        }
        if (results.length > 0) {
            return res.render("register", {
                message: "That name is taken",
            });
        }
        let hashedPass = await bcrypt.hash(password, 8);
        await insertIntoDb(name, hashedPass, conn);
        modifyCookie(req, res, name);
    });
}

function modifyCookie(req, res, name) {
    req.session.isAuth = true;
    req.session.accountName = name;
    res.render("dashboard", { account_name: req.session.accountName });
}

async function insertIntoDb(name, hashedPass, conn) {
    const sql = "INSERT INTO users (name, password) VALUES (?,?) ";
    conn.query(sql, [name, hashedPass], (error, results) => {
        if (error) throw error;
        console.log(results);
    });
}

async function checkPassword(name, hashedPass, conn) {
    const sql = "SELECT name FROM users WHERE name = ? AND password = ?";
    console.log(name + ":" + hashedPass);
    conn.query(sql, [name, hashedPass], (err, results) => {
        if (err) {
            console.log(error);
            app.render("login",{message: "Bad credentials"})
        }
        console.log(results);
    })
}

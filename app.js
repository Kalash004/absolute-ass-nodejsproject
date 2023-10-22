const express = require("express");
const path = require("path");
const dotenv = require("dotenv");
const bcrypt = require("bcrypt");
const fs = require("fs");
const session = require("express-session");
const FileStore = require("session-file-store")(session);
const multer = require("multer");
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
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "filesfromusers");
    },
    filename: (req, file, cb) => {
        console.log(file);
        cb(null, Date.now() + path.extname(file.originalname));
    },
});
const upload = multer({ storage: storage });
// constants
const CHECK_IF_USER_EXISTS_SQL = "SELECT name FROM users WHERE name = ? ";

// routing
app.post("/fileupload", upload.single("image"), (req, res) => {
    res.render("dashboard");
});

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
});

app.post("/auth/register", (req, res) => {
    register(req, res);
});

app.post("/auth/login", (req, res) => {
    login(req, res);
});

app.all("*", (req, res) => {
    render("index");
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
    console.log(password);
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
        checkPassword(name, password, conn, res, req);
    });
}

function register(req, res) {
    const { name, password } = req.body;
    console.log(password);
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
        await insertIntoDb(name, password, conn);
        modifyCookie(req, res, name);
    });
}

function modifyCookie(req, res, name) {
    req.session.isAuth = true;
    req.session.accountName = name;
    res.render("dashboard", { account_name: req.session.accountName });
}

async function insertIntoDb(name, hashedPass, conn) {
    const sql = "INSERT INTO Users (name, password) VALUES (?,?) ";
    conn.query(sql, [name, hashedPass], (error, results) => {
        if (error) throw error;
        console.log(results);
    });
}

function checkPassword(name, password, conn, res, req) {
    const sql = "SELECT password FROM users WHERE name = ? AND password = ?";
    conn.query(sql, [name, password], (err, results) => {
        bool = false;
        if (err) {
            console.log(error);
            res.render("login", { message: "Error happened" });
        }
        if (results.length == 0) {
            console.log("false data");
            res.render("login", { message: "Wrong credentials" });
            return;
        }
        modifyCookie(req, res, name);
    });
}

const express = require("express"); // server code or to run our own server on localhost specified by port
const cors = require("cors"); // this allows us to access our server on a different domain
const bodyParser = require("body-parser"); // this allows us to ready request data JSON object
const app = express(); // initialize express server into a variable
const fs = require("fs"); // use file system of windows or other OS to access local files
const nodemailer = require("nodemailer"); //send email to users
const request = require("request");
const requestAPI = request;
const { Sequelize } = require("sequelize");
const bcrypt = require("bcrypt");
const itemModel = require('./models/itemModel');
const subscriberModel = require('./models/subscriberModel');
const path = require('path');
const { EMAIL, PASSWORD } = require('./env.js');

const sequelize = new Sequelize("paredes", "wd32p", "7YWFvP8kFyHhG3eF", {
  host: "20.211.37.87",
  dialect: "mysql",
});

const User = sequelize.define(
  "user",
  {
    username: {
      type: Sequelize.STRING,
    },
    full_name: {
      type: Sequelize.STRING,
    },
    password: {
      type: Sequelize.STRING,
    },
    email: {
      type: Sequelize.STRING,
    },
  },
  {
    tableName: "user",
    timestamps: false,
  }
);

let rawData = fs.readFileSync("data.json"); // read file from given path
let parsedData = JSON.parse(rawData); // parse rawData (which is a string into a JSON object)
app.use(cors()); // initialize cors plugin on express
app.use(
  bodyParser.urlencoded({
    // initialize body parser plugin on express
    extended: true,
  })
);

app.use(bodyParser.json()); // initialize body parser plugin on express
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
let defaultData = [];

app.post("/api/v2/login", function (request, response) {
  let retVal = { success: false };
  console.log("req: ", request.body);
  User.findOne({
    where: {
      username: request.body.username,
    },
  })
    .then((result) => {
      if (result) {
        return result.dataValues;
      } else {
        retVal.success = false;
        retVal.message = "User Does not Exist!";
      }
    })
    .then((result) => {
      if (result.password === request.body.password) {
        retVal.success = true;
        delete result.password;
        retVal.userData = result;
        return true;
      } else {
        retVal.success = false;
        retVal.message = "Invalid Password!";
        throw new Error("invalid password");
      }
    })
    .finally(() => {
      response.send(retVal);
    })
    .catch((error) => {
      console.log("error: ", error);
      response.send(retVal);
    });
});

const userExist = (username) => {
  return User.findOne({ where: { username: username } });
};
const userExistByEmail = (email) => {
  return User.findOne({ where: { email: email } });
};
const checkDuplicate = (req, res, next) => {
  userExist(req.body.username).then((user) => {
    if (user) {
      return res.send({
        success: false,
        message: "Username already taken.",
      });
    } else {
      userExistByEmail(req.body.email).then((userByEmail) => {
        if (userByEmail) {
          return res.send({
            success: false,
            message: "Email already taken.",
          });
        } else {
          next();
        }
      });
    }
  });
};

app.post("/api/v2/register", checkDuplicate, function (request, response) {
  let retVal = { success: false };
  console.log("req: ", request.body);
  User.findOne({
    where: {
      username: request.body.username,
    },
  }).then((result) => {
    if (result) {
      retVal.success = false;
      retVal.message = "username is already taken";
      response.send(retVal);
    } else {
      const hashedPassword = bcrypt.hashSync(request.body.password, 8);
      User.create({
        username: request.body.username,
        password: hashedPassword,
        full_name: request.body.fullName,
        email: request.body.email,
      })
        .then((result) => {
          return result.dataValues;
        })
        .then((result) => {
          retVal.success = true;
          delete result.password;
          retVal.userData = null;
          // retVal.userData = result; // for auto login after registration
          retVal.userData = result; // for auto login after registration
        })
        .finally(() => {
          response.send(retVal);
        })
        .catch((error) => {
          console.log("error: ", error);
        });
    }
  });
});
app.get("/getProduct", function (req, res) {
  fs.readFile(
    __dirname + "/" + "all-products.json",
    "utf8",
    function (err, data) {
      console.log(data);
      res.send(data); // you can also use res.send()
    }
  );
});
app.get("/keyword", function (req, res) {
  fs.readFile(
    __dirname + "/" + "all-products.json",
    "utf8",
    function (err, data) {
      data = JSON.parse(data);
      console.log(data.tour);
      const result = data.tour.filter(function (obj) {
        return obj["category"]
          .toLowerCase()
          .includes(req.query.i.toLowerCase());
      });
      console.log(result);
      res.send(result); // you can also use res.send()
    }
  );
});

app.get('/store/item-page/:itemId', async (req, res) => {
  try {
      const itemId = req.params.itemId;
      const item = await itemModel.findByPk(itemId);
      if (item) {
          const itemData = {
          item_id: item.item_id,
          item_name: item.item_name,
          item_price: item.item_price,
          item_desc: item.item_desc,
          item_category: item.item_category,
          item_series: item.item_series
          };
          res.json(itemData);
      } else {
          res.status(404).json({ error: 'Item not found' });
      }
      } catch (err) {
      console.log(err);
      res.status(500).json({ error: 'Server error' });
  }
});


app.post('/subscribe', async (req, res) => {

  let retVal = { success: false };
  console.log("req: ", request.body);
  subscriberModel.findOne({
    where: {
      email: req.body.email,
    },
  }).then((result) => {
    if (result) {
      retVal.success = false;
      retVal.message = "This email has already subscribed. Please do not input again.";
      console.log(retVal.message)
      res.send(retVal);
    } else {
      subscriberModel.create({
        email: req.body.email,
      })
        .then((result) => {
          return result.dataValues;
        })
        .then((result) => {
          retVal.message = "Thank you for subscribing!"
          console.log(retVal.message)
          retVal.success = true;
          retVal.userData = null;
          // retVal.userData = result; // for auto login after registration
          retVal.userData = result; // for auto login after registration
        })
        .finally(() => {
          res.send(retVal);
        })
        .catch((error) => {
          console.log("error: ", error);
        });

        let transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: EMAIL,
            pass: PASSWORD
          },
        });
      
        const msg = {
          from: `"Gon's Dispo Vape Shop" <${EMAIL}>`,
          to: `${req.body.email}, ${req.body.email}`,
          subject: "Thanks for Subscribing!",
          text: "Thanks for subscribing!",
        }
      
        let info = transporter.sendMail(msg);
      
        console.log("Message sent: %s", info.messageId);
      }
    });

  
})


const runApp = async () => {
  try {
    await sequelize.authenticate();
    console.log("Connection has been established successfully.");
    app.listen(3005); // run app with this given port
  } catch (error) {
    console.error("Unable to connect to the database:", error);
  }
};
runApp();

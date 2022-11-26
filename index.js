const express = require("express");
const mysql = require("mysql");
const cors = require("cors");
const moment = require('moment');
const path = require('path') ;
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const stripe = require ('stripe')('sk_test_51LLtUVSIEGave4jgnNzQ62i1M8da13CRELe1u8qDlrSRLclDqZ7oQzHc6SVwUA7oXcrrKwrXC05Uat3fIc2qwi3X00PmfYhhpq')

const uuid=require('uuid').v4

const bcrypt = require("bcrypt");
const { response } = require("express");
const saltRounds = 10;

const app = express();

app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:3000", "http://172.17.11.188:3000"],
    methods: ["GET", "POST"],
    credentials: true,
  })
);
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));

var Publishable_Key = "pk_test_51L7MNkSE9Z5QqJ32JvsvT9IkJutVrkOzzVd7J4kBLqS89x128r5fLXdYiGmXt6UmQErW48o8Pg8XDVdTGPdRNwSI00j2HD5yGK"
var Secret_Key = "sk_test_51L7MNkSE9Z5QqJ32IYVutHB6qbbclhNgIGH0k5g20p33iQFdq7DLcVl6S5hcSbtLcchDBDkDVsWKA6b5tr6U9chW006wk1h6br"

app.use(
  session({
    key: "userId",
    secret: "subscribe",
    resave: true,
    saveUninitialized: false,
    cookie: {
      expires: 60 * 60 * 24,
    },
  })
);

const db = mysql.createConnection({
  user: "root",
  host: "localhost",
  password: "",
  database: "project_users",
});

var sess;

app.post("/ManageAccount", (req, res) => {
  
  const id= req.body.id;
  const name= req.body.name;
   const email= req.body.email;
  const username= req.body.username;
  const phone= req.body.phone;
  const password= req.body.password;
  bcrypt.hash(password, saltRounds, (err, hash) => {
    if (err) {
      console.log(err);
    }
  

     db.query(
      "UPDATE customer set fullname=?,email=?,username=?,Phone=?,PASSWORD=? where id=?",
       [name,email,username,phone,hash,id],
      
       (err, result) => {
        console.log("inside if");
        if(err) {
          res.send({message:"error"})
          console.log(err)}
        else {
          console.log({message:"error occured"});
          res.send({message:"success"});
        }
      }
    );
  });

   
  });

app.post("/addBooking",(req,res)=>{
  console.log(req.body);
  const username = req.body.name;
  const booking_date = req.body.book_date;
  const end_date=req.body.end_date;
  const start_date=req.body.start_date;
  const total=req.body.total;
  const token=req.body.t_id;

  console.log("BBBB : " + username + booking_date + start_date + end_date + total + "  " + token); 

  db.query(
    "INSERT INTO Bookings (UserName,Booking_Date,Start_date,End_Date,Total_Price,Payment_Token_Id) VALUES (?,?,?,?,?,?)",
    [username,booking_date,start_date,end_date,total,token],
    (err, result) => {
      //console.log(result);
      if(err) {
        res.send({message:"error occured"})
        console.log(err)
      }
      else {
        res.send(result);
        console.log("Success");
      }
    }
  );



})


app.post("/get_bookings",(req,res)=>{

  const Name=req.body.username
  db.query(
    "SELECT * FROM  Bookings where UserName= ?;",
    Name,
    (err,result)=>{
      if(err){
        console.log("in error");
        console.log(err);
        res.send({err:err});
      }
      console.log(result);
     res.send(result);
    }
  )
});

app.post("/delete_booking",(req,res)=>{

  const id=req.body.id;
  console.log("Id is : " + id);
  db.query(
    "DELETE FROM  Bookings where Booking_Id= ?;",
    id,
    (err,result)=>{
      if(err){
        console.log("in error");
        console.log(err);
        res.send({err:err});
      }
      console.log(result);
     res.send(result);
    }
  )
});

app.post("/payment",(req,res)=>{
  const {product,token} =req.body;
  console.log("Product details : " . product);

  const idempotencyKey=uuid()

  return stripe.customers.create({
    email:token.email,
    source:token.id,
  }).then(customer =>{
    stripe.charges.create({
      amount:product.price * 100,
      currency:'INR',
      customer:customer.id,
      receipt_email:token.email,
      description:product.name,
      shipping:{
        name:token.card.name,
        address:{
            line1: token.card.address_line1,
            line2: token.card.address_line2,
            city: token.card.address_city,
            country: token.card.address_country,
            postal_code: token.card.address_zip,
        },
      }
    },{idempotencyKey})
  })
  .then(result =>res.status(200).json(result))
  .catch(err=>console.log(err))
})

app.post("/payment",async(req,res)=>{
  console.log("payment " +req);
})


app.post("/checkout", async (req, res) => {
  console.log("Request:", req.body);
 
  let error;
  let status;
  try {
    const { product, token } = req.body;

    console.log("product received : " , product);
 
    const customer = await stripe.customers.create({
      email: token.email,
      source: token.id,
    });
 
    const idempotency_key = uuid();
    const charge = await stripe.charges.create(
      {
        amount: product.price * 100,
        currency: "INR",
        customer: customer.id,
        receipt_email: token.email,
        description: `Purchased the ${product.name}`,
        shipping: {
          name: token.card.name,
          address: {
            line1: token.card.address_line1,
            line2: token.card.address_line2,
            city: token.card.address_city,
            country: token.card.address_country,
            postal_code: token.card.address_zip,
          },
        },
      },
      {
        idempotencyKey: idempotency_key
      }
    );
    console.log("Charge:", { charge });
    status = "success";
  } catch (error) {
    console.error("Error:", error);
    status = "failure";
  }
 
  res.json({ error, status });
});

app.get('/logout', function(req, res){
    if (req.session) {
      req.session.destroy(err => {
        if (err) {
          res.send('Unable to log out')
        } else {
          res.send('Logout successful')
        }
      });
    } else {
      res.end()
    }
  });


app.post("/register", (req, res) => {
  const username = req.body.username;
  const fullname = req.body.fullname;
  const password = req.body.password;
  const email =req.body.email;
  const phone=req.body.phone;
  const gender=req.body.gender;

  bcrypt.hash(password, saltRounds, (err, hash) => {
    if (err) {
      console.log(err);
    }
    console.log(username);
    console.log(hash);

    db.query(
      "INSERT INTO customer (fullname,username, PASSWORD,Phone,email,Gender) VALUES (?,?,?,?,?,?)",
      [fullname,username, hash,phone,email,gender],
      (err, result) => {
        console.log("inside if");
        if(err) {
          res.send(err)
          console.log(err)}
        else {
          console.log("Success");
          res.send(result)
        }
      }
    );
  });
});

app.post("/activities", (req, res) => {
  const name = req.body.username;
  const activities=req.body.activities;

    db.query(
      "INSERT INTO user_activities (username,activities) VALUES (?,?)",
      [name,activities],
      (err, result) => {
        //console.log(result);
        if(err) {
          res.send({message:"error occured"})
          console.log(err)
        }
        else {
          res.send(result);
          console.log("Success");
        }
      }
    );
});

/*
app.post("/add_personal_details", (req, res) => {
  const name = req.body.name;
  const dob= req.body.dob;
  const email =req.body.email;
  const gender=req.body.gender;
  const address=req.body.address;
  const aadhar=req.body.aadhar;
  const age=req.body.age;

  sess=req.session;
  sess.user=name;
    db.query(
      "INSERT INTO personaldetails (Name, Address,Age,Dob,Adhar_Card_No,Email,Gender) VALUES (?,?,?,?,?,?,?)",
      [name,address,age,dob,aadhar,email,gender],
      (err, result) => {
        console.log(result);
        if(err) console.log(err)
        else console.log("Success");
      }
    );
});
*/

app.get("/login", (req, res) => {
  console.log(req.session.user);
  if (req.session.user) {
    console.log(req.session.user)
    res.send({ loggedIn: true, user: req.session.user });
  } else {
    res.send({ loggedIn: false });
  }
});



app.post("/personaldetails", (req, res) => {
  const name = req.body.name;
  const dob= req.body.dob;
  const email =req.body.email;
  //const gender=req.body.gender;
  const address=req.body.address;
  const adhar=req.body.aadhar;
  const age=req.body.age;
  const gender=req.body.gender;
  const user=req.body.user;


    db.query(
      "INSERT INTO personaldetails (Name, Address,Age,Dob,Adhar_Card_No,Email,Gender,UserName) VALUES (?,?,?,?,?,?,?,?)",
      [name,address,age,dob,adhar,email,gender,user],
      (err, result) => {
        console.log(result);
        if(err) console.log(err)
        else console.log("Success");
       
      }
    
      
    );
   
})

app.post("/get_destination",(req,res)=>{

  const hotel=req.body.hotel;
  const dst=req.body.dst;
  console.log(dst + "" + hotel);
  db.query( 
    `SELECT  ${dst} From Hotel_Details where Hotel_Name=?`,
    [hotel],
    (err, result) => {
      console.log("inside if");
      if(err) console.log(err);
      console.log(result);
      res.send(result);
    } 
  )
})

app.post("/get_travel_time",(req,res)=>{
  const activity=req.body.act;
  const place=req.body.place;
  console.log(place);

  db.query( 
    `SELECT  ${place} From Activity_Details where Activity_Name=?`,
    [activity],
    (err, result) => {
      console.log("inside if");
      if(err) console.log(err);
      console.log(result);
      res.send(result);
    } 
  )

})

app.post("/Train", (req, res) => {
  const Date = req.body.Date;
  const State = req.body.State;
  const Boarding=req.body.Boarding;
  const Destination=req.body.Destination;
  const Traveller=req.body.Traveller;
  const Adult=req.body.Adult;
  const Children=req.body.Children;
  const Class=req.body.Class;
  const User=req.body.User;

    db.query( 
      "INSERT INTO Train (Date, State ,Boarding,Destination,Traveller,Adult,Children,Class,Username) VALUES (?,?,?,?,?,?,?,?,?)",
      
      
      [Date,State,Boarding,Destination,Traveller,Adult,Children,Class,User],
      
      (err, result) => {
        console.log("inside if");
        if(err) console.log(err);
        console.log(result);
      }
    );

   
  });

  app.post("/get_flight_details",(req,res)=>{
    //console.log(req);
    const airline=req.body.airline;
    console.log("airline : "+airline);
    const fclass=req.body.class;
    console.log("fclass : "+fclass);
    const State=req.body.state;
    console.log("State : " +State);
    const date=req.body.date;
    var temp=moment.utc(date).format('MM/DD/YYYY');
  console.log("temp : " +temp);
    db.query(
      "SELECT * FROM  Flight_Details where Name=? AND Class=? AND Departure_State=? AND Departure_Date>?",
      [airline,fclass,State,temp],
      (err,result)=>{
        if(err){
          console.log("in error");
          console.log(err);
          res.send({err:err});
        }
        console.log(result);
       res.send(result);
      }
    )
})

app.post("/get_bus_details",(req,res)=>{
  //console.log(req);
  const date=req.body.date;
  console.log(date);
  var temp=moment.utc(date).format('YYYY-MM-DD');
  console.log("temp : " +temp);
  //console.log("fclass : "+fclass);
  const State=req.body.state;
  console.log("State : " +State);
  db.query(
    "SELECT * FROM  Bus_Details where Departure_State=? AND Departure_Date<?",
    [State,temp],
    (err,result)=>{
      if(err){
        console.log("in error");
        console.log(err);
        res.send({err:err});
      }
      console.log(result);
     res.send(result);
    }
  )
})

app.post("/get_flight_details",(req,res)=>{
  //console.log(req);
  const airline=req.body.airline;
  console.log("airline : "+airline);
  const fclass=req.body.class;
  console.log("fclass : "+fclass);
  const State=req.body.state;
  console.log("State : " +State);
  db.query(
    "SELECT * FROM  Flight_Details where Name=? AND Class=? AND Departure_State=?",
    [airline,fclass,State],
    (err,result)=>{
      if(err){
        console.log("in error");
        console.log(err);
        res.send({err:err});
      }
      console.log(result);
     res.send(result);
    }
  )
})

app.post("/get_train_details",(req,res)=>{
const date=req.body.date;
var temp=moment(date).format('YYYY-MM-DD');
console.log("temp : " +temp);
const State=req.body.state;
const tclass=req.body.tclass;
const dest=req.body.dest;
console.log("destination is : " +dest);
console.log("tclass : " + tclass);
console.log("State : " +State);
db.query(
  "SELECT * FROM  Train_Details where Departure_State=? AND Class=? AND Departure_Date<=? AND Destination=?",
  [State,tclass,temp,dest],
  (err,result)=>{
    if(err){
      console.log("in error");
      console.log(err);
      res.send({err:err});
    }
    console.log(result);
   res.send(result);
  }
)
})
  





  app.post("/Hotels", (req, res) => {
    const City = req.body.City;
    const Hotels = req.body.Hotels;
    const Rooms=req.body.Rooms;
    const Days=req.body.Days;
    const Nights=req.body.Nights;
    const Breakfast=req.body.Breakfast;
    const Lunch=req.body.Lunch;
    const Dinner=req.body.Dinner;
    const user=req.body.User;
   
  
       db.query(
        "INSERT INTO hotels (City,hotel_name,Rooms,Days,Nights,BreakFast,Lunch,Dinner,UserName) VALUES (?,?,?,?,?,?,?,?,?)",
        
        
        [City,Hotels,Rooms,Days,Nights,Breakfast,Lunch,Dinner,user],
        
        (err, result) => {
          console.log("inside if");
          if(err) console.log(err.data);
          console.log(result);
        }
      );
  
     
    });

    app.post("/Bus", (req, res) => {
      const Date1 = req.body.Date1;
      const State = req.body.State;
      const Stop=req.body.Stop;
      const Destination=req.body.Destination;
      const Traveller=req.body.Traveller;
      const Adult=req.body.Adult;
      const Children=req.body.Children;
      const User=req.body.User;
      
    
         db.query(
          "INSERT INTO bus (Date, State ,Boarding,Destination,Traveller,Adult,Children,UserName) VALUES (?,?,?,?,?,?,?,?)",
          
          
          [Date1,State,Stop,Destination,Traveller,Adult,Children,User],
          
          (err, result) => {
            console.log("inside if");
            if(err) console.log(err);
            console.log(result);
          }
        );
    
       
      });

      app.post("/Flight", (req, res) => {
        const Date = req.body.Date;
        const State = req.body.State;
        const Boarding=req.body.Boarding;
        const Destination=req.body.Destination;
        const Traveller=req.body.Traveller;
        const Adult=req.body.Adult;
        const Children=req.body.Children;
        const Airlines=req.body.Airlines;
        const FlightClass=req.body.FlightClass;
        const User=req.body.User;
      
           db.query(
            "INSERT INTO Flight (Date,State,Boarding,Destination,Traveller,Adult,Children,Airlines,FlightClass,UserName) VALUES (?,?,?,?,?,?,?,?,?,?)",
            
            
            [Date,State,Boarding,Destination,Traveller,Adult,Children,Airlines,FlightClass,User],
            
            (err, result) => {
              console.log("inside if");
              if(err) console.log(err.data);
              console.log(result);
            }
          );
      
         
        });

app.get("/temp", (req, res) => {
  console.log(req.session);
  console.log(sess.user);
 res.send(sess.user)
});

app.post("/get_activities",(req,res)=>{
  //console.log(req);
  const Name=req.body.username
  console.log(Name);

  db.query(
    "SELECT * FROM  user_activities where username= ?;",
    Name,
    (err,result)=>{
      if(err){
        console.log("in error");
        console.log(err);
        res.send({err:err});
      }
      console.log(result);
     res.send(result);
    }
  )
})

app.post("/get_activities_details",(req,res)=>{
  //console.log(req);
  const Name=req.body.activity;

  db.query(
    "SELECT * FROM Activity_Details where Activity_Name= ?;",
    Name,
    (err,result)=>{
      if(err){
        console.log("in error");
        console.log(err);
        res.send({err:err});
      }
      console.log("Activity Details : " , result);
     res.send(result);
    }
  )
})

app.post("/get_accomodation_details",(req,res)=>{
  console.log("Inside hotel erver");
  const Name=req.body.username
  console.log(Name);

  db.query(
    "SELECT H.*,HD.* FROM hotels H,Hotel_Details HD WHERE (H.hotel_name = HD.Hotel_Name) And (H.UserName=?);",
    Name,
    (err,result)=>{
      if(err){
        console.log("in error");
        console.log(err);
        res.send({err:err});
      }
      console.log(result);
     res.send(result);
    }
  )
})

app.post("/get_travel_mode",(req,res)=>{
  console.log("inside get travel mode");
  const Name=req.body.username;

  db.query(
    "Select Mode from travel_details where UserName=?",
    [Name],
    (err,result)=>{
      if(err){
        console.log("in error");
        console.log(err);
        res.send({err:err});
      }
      console.log(result);
      res.send(result);
    }  
  )
})

app.post("/get_flight",(req,res)=>{
  console.log("inside get flight mode");
  const Name=req.body.username;

  db.query(
    "Select * from Flight where UserName=?",
    [Name],
    (err,result)=>{
      if(err){
        console.log("in error");
        console.log(err);
        res.send({err:err});
      }
      console.log(result);
      res.send(result);
    }  
  )
});

app.post("/get_bus",(req,res)=>{
  console.log("inside get bus mode");
  const Name=req.body.username;

  db.query(
    "Select * from bus where UserName=?",
    [Name],
    (err,result)=>{
      if(err){
        console.log("in error");
        console.log(err);
        res.send({err:err});
      }
      console.log(result);
      res.send(result);
    }  
  )
});

app.post("/get_train",(req,res)=>{
  console.log("inside get train mode");
  const Name=req.body.username;

  db.query(
    "Select * from Train where UserName=?",
    [Name],
    (err,result)=>{
      if(err){
        console.log("in error");
        console.log(err);
        res.send({err:err});
      }
      console.log(result);
      res.send(result);
    }  
  )
});



app.post("/activity_table",(req,res)=>{
  console.log("Inside update activity");
  const Name=req.body.User;
  const mode=req.body.Mode;
  console.log(Name + mode);

  db.query(
    "INSERT INTO travel_details (UserName,Mode) VALUES (?,?)",
    [Name,mode],
    (err,result)=>{
      if(err){
        console.log("in error");
        console.log(err);
        res.send({err:err});
      }
      console.log(result);
     res.send(result);
    }
  )
})

app.post("/login", (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  sess=req.session;
  sess.user=username;

  db.query(
    "SELECT * FROM customer WHERE username = ?;",
    username,
    (err, result) => {
      if (err) {
        res.send({ err: err });
      }

      if (result.length > 0) {
        console.log(password)
        console.log(result[0])
        bcrypt.compare(password, result[0].PASSWORD, (error, response) => {
          if (response) {
            req.session.user = result;
            console.log(result);
            res.send(result);
          } else {
            res.send({ message: "Wrong username/password combination!" });
          }
        });
      } else {
        res.send({ message: "User doesn't exist" });
      }
    }
  );
});

/*
db.connect((err)=>{
	if((err) =>{
		console.log(err)
	})
	console.log("DB connected")

})
*/




app.post('/payment', function(req, res){ 

	// Moreover you can take more details from user 
	// like Address, Name, etc from form 
	stripe.customers.create({ 
		email: req.body.stripeEmail, 
		source: req.body.stripeToken, 
		name: 'Renisha', 
		address: { 
			line1: 'TC 9/4 Old MES colony', 
			postal_code: '110092', 
			city: 'New Delhi', 
			state: 'Delhi', 
			country: 'India', 
		} 
	}) 
	.then((customer) => { 

		return stripe.charges.create({ 
			amount: 7000,	 // Charing Rs 25 
			description: 'Travel and Tousrism', 
			currency: 'USD', 
			customer: customer.id 
		}); 
	}) 
	.then((charge) => { 
		res.send("Success") // If no error occurs 
	}) 
	.catch((err) => { 
		res.send(err)	 // If some error occurs 
	}); 
}) 


app.listen(3001, '0.0.0.0', () => {
	console.log("running server");
  });

  app.post("/forgotpassword1", (req, res) => {
    // console.log("i m saish ");
    const email1 = req.body.email;
    const username = req.body.username;
    console.log(req.body);
    //sess=req.session;
    //sess.user=username;
  
     db.query(
     'SELECT email from customer where username=?;', 
      
     [ username],
       (err, result) => {
    //     if (err) {
         res.send(result);
   // console.log(result.data);
    //     }
  
        if (result==email1) {
          // console.log("jeston")
           console.log(result);
          // console.log(email1);
  
    //       console.log(result[0])
    //       bcrypt.compare(password, result[0].PASSWORD, (error, response) => {
    //         if (response) {
    //           req.session.user = result;
    //           console.log(result);
    //           res.send(result);
            }
            else {
            
              // console.log("saish");
              console.log(result);
             }
    //       });
    //     } else {
    //       res.send({ message: "User doesn't exist" });
    //     }
      }
     );
  });
  ///////////////////////////
  
  
  
  
  app.post("/forgot", (req, res) => {
    
    const passwd= req.body.passwd;
    const user= req.body.user;
    
    bcrypt.hash(passwd, saltRounds, (err, hash) => {
      if (err) {
        console.log(err);
      }
    
  
       db.query(
        "UPDATE customer set PASSWORD=? where username=?",
         [hash,user],
        
         (err, result) => {
          console.log("inside if");
          if(err) {
            res.send(err)
            console.log(err)}
          else {
            console.log("Success");
            res.send(result)
          }
        }
      );
    });
  
     
    });

    app.post("/footer", (req, res) => {
      const mail = req.body.mail;
      
    
    
        db.query(
          "INSERT INTO footer (email) VALUES (?)",
          [mail],
          (err, result) => {
            console.log(result);
            if(err) console.log(err)
            else console.log("Success");
            res.send({message:"success"})
           
          }
        
          
        );
       
    })
  
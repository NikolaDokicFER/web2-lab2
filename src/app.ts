import express from 'express';
import fs from 'fs';
import path from 'path'
import https from 'https';
import dotenv from 'dotenv'
import bodyParser from 'body-parser'
import {Pool} from 'pg'
import cookieParser from 'cookie-parser';
import csrf from 'csurf'

dotenv.config()
const app = express();

app.set("views", path.join(__dirname, "views"));
app.use("/styles",express.static(__dirname + "/styles"));
app.set('view engine', 'ejs');

app.use(cookieParser(process.env.SECRET));
var csrfProtect = csrf({cookie: true})
var urlencodedParser = bodyParser.urlencoded({extended: false})

const externalUrl = process.env.RENDER_EXTERNAL_URL;
const port = externalUrl && process.env.PORT ? parseInt(process.env.PORT) : 4080

const config = {
  baseURL:  externalUrl ||  `https://localhost:${port}`
};

const pool = new Pool()
  
app.get('/',(req, res) => {
  res.redirect('/sql/safe')
});

app.get('/sql/safe', (req, res) => {
  res.render('sqls', {
    players: []
  });
});

app.get('/sql/unsafe', (req, res) => {
  res.render('sqlu', {
    players: []
  });
});

app.get('/csrf/safe', csrfProtect , (req, res) => {
  res.render('csrfs', {
    csrfToken: req.csrfToken(),
    success: false
  });
});

app.get('/csrf/unsafe', (req, res) => {
  res.render('csrfu', {
    success: false
  });
});

app.get('/csrf/test', (req,res) => {
  res.render('csrftest')
});

app.post('/sql/safe', urlencodedParser, async (req, res) =>{
  var playersQueried
  try{
    const resp = await pool.query('SELECT * FROM players WHERE firstname=$1', [req.body.playerName])
    playersQueried = resp.rows
  }catch(err){
    console.log(err)
    playersQueried = []
  }
  res.render('sqls', {
    players: playersQueried
  });;
})

app.post('/sql/unsafe', urlencodedParser, async (req, res) =>{
  var playersQueried
  try{
    const resp = await pool.query(`SELECT * FROM players WHERE firstname=\'${req.body.playerName}\'`)
    playersQueried = resp.rows
  }catch(err){
    console.log(err)
    playersQueried = []
  }
  res.render('sqlu', {
    players: playersQueried
  });;
})

app.post('/csrf/safe', urlencodedParser, csrfProtect, (req, res) => {
  res.render('csrfs', {
    csrfToken: req.csrfToken(),
    success: true
  });
});


app.post('/csrf/unsafe', (req, res) => {
  res.render('csrfu', {
    success: true
  });
});


if (externalUrl) {
  const hostname = '127.0.0.1';
  app.listen(port, hostname, () => {
  console.log(`Server locally running at http://${hostname}:${port}/ and from
  outside on ${externalUrl}`);
  });
}else{
  https.createServer({
    key: fs.readFileSync('server.key'),
    cert: fs.readFileSync('server.cert')
    }, app)
    .listen(port, function () {
      console.log(`Server running at https://localhost:${port}/`);
      });
}

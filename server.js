'use strict';

const express = require('express');
const mongo = require('mongodb');
const mongoose = require('mongoose');
const autoIncrement = require('mongoose-auto-increment');
const cors = require('cors');
const bodyParser = require('body-parser');
const dns = require('dns');
const app = express();

// Basic Configuration 
const port = process.env.PORT || 3000;

/** this project needs a db !!!!! **/ 
mongoose.connect(process.env.MONGO_URI);
autoIncrement.initialize(mongoose.connection);

const Schema = mongoose.Schema;

const shortURLSchema = new Schema({
    full_url: String
  }, {
    collection : 'URLs'
  }
);

shortURLSchema.plugin(autoIncrement.plugin, 'shortURL');
const shortURL = mongoose.model('shortURL', shortURLSchema);

const createShortURL = (url, done) => {
  let docURL = new shortURL({
    full_url: url
  });
  docURL.save((error, data) => error ? done(error) : done(null, data));
};

const findURL = (url, done) => {
  shortURL
    .findOne({
      full_url: url
    })
    .exec((error, data) => error ? done(error) : done(null, data));
};

const unshortenURL = (url, done) => {
  shortURL
    .findOne({
      _id: url
    })
    .exec((error, data) => error ? done(error) : done(null, data));
};

app.use(cors());

/** this project needs to parse POST bodies **/
app.use(bodyParser.urlencoded({extended: false}));

app.use('/public', express.static(process.cwd() + '/public'));

app.get('/', (req, res) => {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Redirecting
app.get('/api/shorturl/:id', (req, res) => {
  
  unshortenURL(req.params.id, (error, data) => {
    if (error) {return res.json({error: 'url not found'})}
    
    if (data) {
      let redirectTo = /^(?!https?:\/\/.*$).*/.test(data['full_url']) ? 
          'http://' + data['full_url'] : 
          data['full_url'];
      res.redirect(redirectTo);
    } else {
      res.json({error: 'url not found'});
    };
  });
  
});

// Shortening
app.post('/api/shorturl/new', (req, res) => {
  
  const addIfNotPresent = (error, data) => {
    
    if (error) {return console.log(error)}
      
    if (data) {
      console.log('Already in DB: ' + req.body.url);
      res.json({
        original_url: data['full_url'],
        short_url: data['_id']
      }); 
    } else {
      console.log('New entry: ' + req.body.url);
      createShortURL(req.body.url, (error, data) => {
        if (error) {return console.log(error)}
        res.json({
          original_url: data['full_url'],
          short_url: data['_id']
        });
      });
    };
    
  };

  // truncates url to hostname
  let host = req.body.url.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  
  dns.lookup(host, (error, address, family) => {
    if (error) {
      return res.json({error: 'invalid URL'});
    }; 
    findURL(req.body.url, addIfNotPresent);
  });
  
});

app.listen(port, () => {
  console.log('Node.js listening ...');
});
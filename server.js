var express = require('express'),
    app = express(),
    server = require('http').createServer(app),
    request = require('request'),
    util = require('util'),
    http = require('http'),
    port = process.env.PORT || 9000
;

var BinaryServer = require('binaryjs').BinaryServer;
var fs = require('fs');

app.configure(function(){
  app.engine('html', require('ejs').renderFile);
  app.use(express.logger());
  app.use(express.cookieParser());
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.session({ secret: 'keyboard cat' }));
  app.use(app.routes);
  app.use(express.static(__dirname + '/public'));
  app.use(express.static(__dirname + '/views'));
    app.use(express.static(__dirname + '/'));
  app.use('/public', express.static('public'));
  app.use('/public/zxcvbn', express.static('node_modules/zxcvbn/zxcvbn'));
});

var binaryserver = new BinaryServer({server: server, path: '/binary-endpoint'});

binaryserver.on('connection', function(client){
  var file = fs.createReadStream(__dirname + '/prueba.mp3');
  client.send(file);
});

app.get('/', function(req,res){
    res.render('index.html');
})

server.listen(port);
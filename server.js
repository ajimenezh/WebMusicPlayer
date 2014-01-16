var express = require('express'),
    app = express(),
    appStream = express(),
    server = require('http').createServer(app),
    serverStream = require('http').createServer(appStream),
    io = require('socket.io').listen(server),
    UserProvider = require('./model/userprovider').UserProvider,
    request = require('request'),
    util = require('util'),
    http = require('http'),
    port = process.env.PORT || 5000,
    portStream = 9000
;

var neo4j = require('neo4j');
var db = new neo4j.GraphDatabase('http://localhost:7474');

var userProvider = new UserProvider();

var id3 = require('id3js');

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

function findInEdges(edges, key, value, callback) {
  var node = null;
  var x = 0;
  for (var i in edges) {
    db.getNode(edges[i].end._data.self, function(err, result) {
      if (result.data[key]==value) node = result;
      x++;
      if (x==edges.length) callback(null, node);
    });
  }
}

function parseNodes(edges, callback) {
  if (edges.length==0) callback(null, edges);
  var x = 0;
  var list = [];
  for (var i=0; i<edges.length; i++) {
    db.getNode(edges[i].end._data.self, function(err, result) {
      var tmp = result.data;
      tmp.url = result._data.self;
      list.push(tmp);
      x++;
      if (x==edges.length) callback(null, list);
    });
  } 
};

function insertArtist(artist, user, callback) {
  db.getIndexedNodes('users', 'user', user, function(err, result){
    if (typeof result=="undefined" || result.length==0) {
      callback(null, null);
    }
    else {
      parent = result[0];
      parent.outgoing('artist', function(err, edges){
        if (typeof edges=="undefined" || edges.length==0) {
          var node = db.createNode({'artist': artist});
          node.save(function(err, node) {
            if (err) {
              console.log("ERROR: Error while saving a node in neo4j database");
              console.dir(err);
              callback(err);
            }
            else {
              node.index("artists", "artist", artist, function(err){
              });
              parent.createRelationshipTo(node, 'artist', function(err, edge) {
                edge.save(function(err, edge){
                });
                callback(null, node);
              });
            }
          })
        }
        else {
          findInEdges(edges, 'artist', artist, function(err, found){
            if (found) {
              callback(null, found);
            }
            else {
              var node = db.createNode({'artist': artist});
              node.save(function(err, node) {
                if (err) {
                  console.log("ERROR: Error while saving a node in neo4j database");
                  callback(err);
                }
                else {
                  node.index("artists", "artist", artist, function(err){
                  });
                  parent.createRelationshipTo(node, 'artist', function(err, edge) {
                    edge.save(function(err, edge){
                    });
                    callback(null, node);
                  });
                }
              });
            }
          });
        }
      });
    }
  });
}


function insertAlbum(parent, album, callback) {
  parent.outgoing('album', function(err, edges){
    if (typeof edges=="undefined" || edges.length==0) {
      var node = db.createNode({'album': album});
      node.save(function(err, node) {
        if (err) {
          console.log("ERROR: Error while saving a node in neo4j database");
          callback(err);
        }
        else {
          node.index("albums", "album", album, function(err){
          });
          parent.createRelationshipTo(node, 'album', function(err, edge) {
            edge.save(function(err, edge){
            });
            callback(null, node);
          });
        }
      })
    }
    else {
      findInEdges(edges, 'album', album, function(err, found){
        if (found) {
          callback(null, found);
        }
        else {
          var node = db.createNode({'album': album});
          node.save(function(err, node) {
            if (err) {
              console.log("ERROR: Error while saving a node in neo4j database");
              callback(err);
            }
            else {
              node.index("albums", "album", album, function(err){
              });
              parent.createRelationshipTo(node, 'album', function(err, edge) {
                edge.save(function(err, edge){
                });
                callback(null, node);
              });
            }
          });
        }
      });
    }
  });
}

function insertSong(parent, song, _dir, callback) {
  parent.outgoing('song', function(err, edges){
    if (typeof edges=="undefined" || edges.length==0) {
      var node = db.createNode({'song': song.title, 'dir':_dir, 'track': song.track});
      node.save(function(err, node) {
        if (err) {
          console.log("ERROR: Error while saving a node in neo4j database");
          callback(err);
        }
        else {
          node.index("songs", "song", song.title, function(err){
          });
          parent.createRelationshipTo(node, 'song', function(err, edge) {
            edge.save(function(err, edge){
            });
            callback(null, node);
          });
        }
      })
    }
    else {
      findInEdges(edges, 'song', song.title, function(err, found){
        if (found) {
          callback(null, found);
        }
        else {
          var node = db.createNode({'song': song.title, 'dir':_dir, 'track': song.track});
          node.save(function(err, node) {
            if (err) {
              console.log("ERROR: Error while saving a node in neo4j database");
              callback(err);
            }
            else {
              node.index("songs", "song", song.title, function(err){
              });
              parent.createRelationshipTo(node, 'song', function(err, edge) {
                edge.save(function(err, edge){
                });
                callback(null, node);
              });
            }
          });
        }
      });
    }
  });
}

var binaryserver = new BinaryServer({server: serverStream, path: '/binary-endpoint'});

var client;

binaryserver.on('connection', function(_client){
  client = _client;

  client.on('stream', function(stream, meta){
    console.dir(meta);
    var file = fs.createWriteStream(__dirname+"/Music/"+meta.name);
    stream.pipe(file);

    var total = 0;
    stream.on('data', function(data) {
      stream.write({rx: data.length / meta.size});
      total += data.length;
      if (total==meta.size) {
        id3({ file: __dirname+"/Music/"+meta.name, type: id3.OPEN_LOCAL }, function(err, tags) {
          //console.dir(tags);

          var title, album, artist, track;

          if (!tags.title) {
            if (!tags.v2.title) {
              title = tags.v1.title;
            }
            else {
              title = tags.v2.title;
            }
          }
          else title = tags.title;

          if (!tags.album) {
            if (!tags.v2.album) {
              album = tags.v1.album;
            }
            else {
              album = tags.v2.album;
            }
          }
          else album = tags.album;

          if (!tags.artist) {
            if (!tags.v2.artist) {
              artist = tags.v1.artist;
            }
            else {
              artist = tags.v2.artist;
            }
          }
          else artist = tags.artist;

          if (!tags.v1.track) {
            track = tags.v2.track;
            for (var k in track) {
              if (track[k]=='/') {
                track = track.substring(0,k);
                break;
              }
            }
          }
          else {
            track = tags.v1.track;
          }

          insertArtist(artist, meta.user, function(err, artistNode){
            if (err) {
              console.log("Error: Error inserting artist");
            }
            else {
              insertAlbum(artistNode, album, function(err, albumNode){
                insertSong(albumNode, {'title':title, 'track':track}, meta.name, function(err, songNode) {

                });
              });
            }
          });
        });
      }
    })
  });
});

io.sockets.on('connection', function(socket){

  console.log("--- io.sockets.on connection");

  socket.on('send dir', function(data){
    dir = data.dir;
    if (typeof dir == "undefined") {
      console.dir("Error: Path undefined");
    }
    else {
      db.getNode(dir, function(err, result) {
        if (typeof result=="undefined" || !result) {
          var files = [];
          socket.emit('directories', files);
        }
        else {
          var type;
          if (typeof result.data.artist=="undefined" && typeof result.data.artist) {
            if (typeof result.data.album=="undefined" && typeof result.data.album) {
            }
            else {
              type = "song";
            }
          }
          else {
            type = "album";
          }
          result.outgoing(type, function(err, edges){
            parseNodes(edges, function(err, files) {
              socket.volatile.emit('directories', {'files':files, 'dir':result._data.self});
            });
          });
        }
      });
    }
  });

  socket.on('play', function(data){
    var dir = data.dir;
    db.getNode(dir, function(err, result) {
      console.dir("hola");
      socket.emit('playit',"./Music/" + result.data.dir);
    });
  });

  socket.on('get_parent', function(data) {
    var dir = data.dir;
    db.getNode(dir, function(err, result) {
      var type;
      if (typeof result.data.song=="undefined" && typeof result.data.song) {
        if (typeof result.data.album=="undefined" && typeof result.data.album) {
          if (typeof result.data.artist=="undefined" && typeof result.data.artist) {
          }
          else {
            type = 'artist';
          }
        }
        else {
          type = "album";
        }
      }
      else {
        type = "song";
      }
      if (typeof type=="undefined" || !type) {
        socket.emit('parent', result._data.self);
      }
      else {
        result.incoming(type, function(err, result) {
          socket.emit('parent', result[0].start._data.self);
        });
      }
    });
  });

});

function getFiles(dir, callback){
    var files = fs.readdirSync(dir);
    var f = [];
    var x = 0;
    for(var i in files){
        if (!files.hasOwnProperty(i)) continue;
        var name = dir+'/'+files[i];
        if (fs.statSync(name).isDirectory()){
          f.push({dir:name, name: files[i], type:"folder"});
          x++;
          if (x==files.length) callback(null, f);
        }else{
          f.push({dir:name, name: files[i], type:"archive"});
          x++;
          if (x==files.length) callback(null, f);
        }
    }
}

app.get('/', function(req,res){
  userProvider.findOneEmail('admin', function(err, result) {
    if (typeof result == "undefined" || !result) {
      var user = {'name': 'admin', 'email':'admin'};
      userProvider.insert(user, function(err, result) {
        userProvider.findOneEmail('admin', function(err, result) {
          var node = db.createNode({'user': 'admin'});
          node.save(function(err, node) {
            node.index("users", "user", "admin", function(err){
              req.session.user = result;
              var dir = './Music';
              var files = []
              res.render('home2.html',{
                files: files,
                dir: dir,
                user: req.session.user
              });
            });
          });
        });
      });
    }
    else {
      req.session.user = result;
      db.getIndexedNodes('users', 'user', 'admin', function(err, result){
        if (typeof result!="undefined" && result) {
          var dir = result[0]._data.self;
          result[0].outgoing('artist', function(err, edges){
            parseNodes(edges, function(err, files) {
              res.render('home2.html',{
                files: files,
                dir: dir,
                user: req.session.user
              });
            });
          });
        }
        else {
          var files = [];
          res.render('home2.html',{
            files: files,
            dir: dir,
            user: req.session.user
          });
        }
      });
    }
  });
});


serverStream.listen(portStream);
server.listen(port);

db.getIndexedNodes('artists', 'artist', 'Taking Back Sunday', function(err, result){
  if (typeof result == "undefined") ;
  else {
    console.dir(result);
    console.dir(result.length);
  }
});

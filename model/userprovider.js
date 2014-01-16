var mongostr = 'mongodb://alex:qwertyASD@dharma.mongohq.com:10061/app19679708'
var localstr = "mongodb://localhost/test";

var connect = require('connect');
var mongo = require('mongodb');
var BSON = mongo.BSONPure;
var database = null;

UserProvider = function() {
  mongo.connect(localstr, {}, function(error, db){
    console.log("connected, db: " + db);

    database = db;

    database.addListener("error", function(error){
      console.log("Error connecting to MongoLab");
    });
  });
};

UserProvider.prototype.getCollection= function(callback) {
	if (!database) {
		callback("ERROR: database is not ready yet");
	}
	else {
		database.collection('userCollection', function(error, user_collection) {
			if (error) callback(error);
			else callback(null, user_collection);
		})
	}
}

UserProvider.prototype.findAll = function(callback) {
	this.getCollection(function(error, user_collection) {
		if (error) callback(error) 
		else {
			user_collection.find().toArray(function(error, results) {
				if (error) callback(error)
				else callback(null, results)
			});
		}
	})
};

UserProvider.prototype.findOneName = function(req, callback) {
	this.getCollection(function(error, user_collection) {
		if (error) callback(error) 
		else {
			user_collection.findOne({userName: req}, function(error, results) {
				if (error) callback(error);
				else callback(null, results);
			});
		}
	});
};

UserProvider.prototype.findOneEmail = function(req, callback) {
	this.getCollection(function(error, user_collection) {
		if (error) callback(error) 
		else {
			user_collection.findOne({userEmail: req}, function(error, results) {
				if (error) callback(error);
				else callback(null, results);
			});
		}
	});
};

UserProvider.prototype.findOneId = function(req, callback) {
	this.getCollection(function(error, user_collection) {
		if (error) callback(error) 
		else {
			user_collection.findOne({_id : BSON.ObjectID(req)}, function(error, results) {
				if (error) callback(error);
				else callback(null, results);
			});
		}
	});
};

UserProvider.prototype.update = function(req, callback) {
	this.getCollection(function(error, user_collection) {
		if (error) callback(error) 
		else {
			user_collection.save({
				_id : BSON.ObjectID(req._id),
				userName: req.userName,
				userEmail: req.userEmail,
				userPassword: req.userPassword,
				userPhoto: req.userPhoto,
				userChats: req.userChats,
				userGroups: req.userGroups,
				userFriends: req.userFriends,
				userColor: req.userColor
			}, function(error, results) {
				if (error) callback(error);
				else callback(null, results);
			});
		}
	});
};


UserProvider.prototype.insert = function(req, callback) {
	this.getCollection(function(error, user_collection) {
		if (error) callback(error)
		else {
			user_collection.findOne({ userEmail: req.email}, function(error, result) {
				if (error) callback(error);
				else {
					if (!result) {
						user_collection.insert({
							userName: req.name,
							userEmail: req.email,
							userPassword: req.password,
							userFriends: []
						}, function(error, result) {
							if(error) callback(error);
							else callback(null,result);
						});
					}
					else {
						callback(null, result);
					}
				}
			})
		}
	});
};

UserProvider.prototype.insertChat = function(req, callback) {
	this.getCollection(function(error, user_collection) {
		if (error) callback(error)
		else {
			user_collection.update(
				{Name: req.displayName}, 
				{ $push: {userChats: req.chatHash } },
				function(error, result) {
				if(error) {
					callback(error);
				}
				else callback(null,result);
			});
		}
	});
};

UserProvider.prototype.insertGroup = function(req, callback) {
	this.getCollection(function(error, user_collection) {
		if (error) callback(error)
		else {
			user_collection.findOne(
				{_id: BSON.ObjectID(req.id) }, 
				function(error, result){
					if (result.userGroups.indexOf(req.groupHash.toString())>=0) callback(null, result);
					else {
						user_collection.update(
							{ _id: BSON.ObjectID(req.id) }, 
							{ $push: {userGroups: req.groupHash.toString() } },
							function(error, result) {
							if(error) {
								callback(error);
							}
							else callback(null,result);
						});
					}
			});
		}
	});
};

UserProvider.prototype.findAllChats = function(req, callback) {
	this.getCollection(function(error, user_collection) {
		if (error) callback(error) 
		else {
			user_collection.findOne(
				{ Name:req },
				function(error, results) {
					if (error) callback(error)
					else callback(null, results.userChats);
			});
		}
	})
};

UserProvider.prototype.findAllGroups = function(req, callback) {
	this.getCollection(function(error, user_collection) {
		if (error) callback(error) 
		else {
			user_collection.findOne(
				{ Name:req },
				function(error, results) {
					if (error) callback(error)
					else callback(null, results.userGroups);
			});
		}
	})
};

UserProvider.prototype.findAllFriends = function(req, callback) {
	this.getCollection(function(error, user_collection) {
		if (error) callback(error) 
		else {
			user_collection.findOne(
				{ _id : BSON.ObjectID(req) },
				function(error, results) {
					if (error) callback(error)
					else callback(null, results.userFriends);
			});
		}
	})
};

UserProvider.prototype.insertFriend = function(req, callback) {
	this.getCollection(function(error, user_collection) {
		if (error) callback(error)
		else {
			user_collection.findOne(
				{_id: BSON.ObjectID(req.user) }, 
				function(error, result){
					if (result.userFriends.indexOf(req.friend)>=0) callback(null, false);
					else {
						user_collection.update(
							{_id: BSON.ObjectID(req.user)}, 
							{ $push: {userFriends: req.friend } },
							function(error, result) {
							if(error) {
								callback(error);
							}
							else callback(null,result);
						});
					}
			});
		}
	});
};

exports.UserProvider = UserProvider;
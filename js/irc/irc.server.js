if (typeof(IRC) == 'undefined') var IRC = {};

IRC.Server = function(host, port, nick, user, encoding) {
  this.encoding = 'utf-8';
  if (user) {
    this.host = host;
    this.port = port;
    this.nick = nick;
    this.user = user;
    if (encoding) this.encoding = encoding;
  }
  else {
    this.host = host;
    this.port = 6667;
    this.nick = port;
    this.user = nick;
    if (user) this.encoding = user;
  }
  this.pass = null;
  this.channels = {};
  //this.tcpClient = new TcpClient(this.host, this.port, this.encoding);
  this.tcpClient = null;
  this.reservedCommands = [];
  this.ready = false;
  this.replyListeners = [];
  this.memberListeners = [];
  this.channelListeners = [];
}
IRC.Server.prototype.hasChannel = function(channelName) {
  return this.getChannel(channelName) != null;
};
IRC.Server.prototype.getChannel = function(channelName) {
  return this.channels[channelName];
};
IRC.Server.prototype.getAnyChannel = function() {
  for (var channelName in this.channels) {
    return this.getChannel(channelName);
  }
  return null;
};
IRC.Server.prototype.addChannel = function(channel) {
  var channelName;
  if (typeof(channel) == 'string') {
    channelName = channel;
    channel = new IRC.Channel(this, channelName);
  }
  else {
    channel.server = this;
    channelName = channel.name;
  }
  this.channels[channelName] = channel;
  for (var i = 0; i < this.channelListeners.length; i++) {
    this.channelListeners[i](IRC.Events.CHANNEL_ADDED, channel);
  }
};
IRC.Server.prototype.removeChannel = function(channel) {
  var channelName;
  if (typeof(channel) == 'string') {
    channelName = channel;
    channel = this.channels[channelName];
  }
  else {
    channelName = channel.name;
  }
  delete this.channels[channelName];

  for (var i = 0; i < this.channelListeners.length; i++) {
    this.channelListeners[i](IRC.Events.CHANNEL_REMOVED, channel);
  }
};
IRC.Server.prototype.join = function(channelName) {
  if (!this.getChannel(channelName)) this.addChannel(channelName);
  this.send(new IRC.Message('JOIN', channelName));
  return this.getChannel(channelName);
};
IRC.Server.prototype.joinAllOnConnect = function() {
  for (var channelName in this.channels) {
    var channel = this.getChannel(channelName);
    if (channel.shouldJoinOnConnect) this.join(channelName);
  }
};
IRC.Server.prototype.joinAll = function() {
  for (var channelName in this.channels) {
    this.join(channelName);
  }
};
IRC.Server.prototype.addReplyListener = function(listener) {
  this.replyListeners.push(listener);
};
IRC.Server.prototype.clearReplyListeners = function() {
  this.replyListeners.clear();
};
IRC.Server.prototype.addMemberListener = function(listener) {
  this.memberListeners.push(listener);
};
IRC.Server.prototype.clearMemberListener = function() {
  this.memberListeners.clear();
};
IRC.Server.prototype.addChannelListener = function(listener) {
  this.channelListeners.push(listener);
};
IRC.Server.prototype.clearChannelListener = function() {
  this.channelListeners.clear();
};
IRC.Server.prototype.send = function(message, force, callback) {
  if (arguments.length == 1) {
    force = false;
  }
  else if (arguments.length == 2) {
    if (typeof(force) == 'function') {
      callback = force;
      force = false;
    }
  }

  if (force || this.ready) {
    this.tcpClient.sendMessage(message.toString(), callback);
  }
  else {
    this.reservedCommands.push([message, callback]);
  }
};
IRC.Server.prototype.forceSend = function(message, callback) {
  return this.send(message, true, callback);
};
IRC.Server.prototype.connect = function() {
  this.tcpClient = new TcpClient(this.host, parseInt(this.port), this.encoding);
  this.tcpClient.connect(function() {
    this.tcpClient.addResponseListener(function(response) {
      var replies = response.split('\r\n');
      for (var i = 0; i < replies.length; i++) {
        var reply = replies[i];
        if (reply == '\r\n') continue;
        var message = IRC.Message.parse(reply);
        if (!message) continue;

        if (message.command == 'PRIVMSG') {
          message.interprete();
          var channel = this.getChannel(message.channelName);
          channel.messages.push(message);
        }
        else if (message.command == 'PING') {
          console.log(message);
          var pong = message.copy();
          pong.command = 'PONG';
          this.send(pong);
        }
        else if (message.command == 'JOIN') {
          message.interprete();
          var channel = this.getChannel(message.channelName);
if (!channel) console.log('>>>>>> ', message );
          if (0 < channel.addMember(message.sender).length) {
            for (var j = 0; j < this.memberListeners.length; j++) {
              this.memberListeners[j](IRC.Events.MEMBER_ADDED, message.sender, channel);
            }
          }
        }
        else if (message.command == 'PART') {
          message.interprete();
          var channel = this.getChannel(message.channelName);
          channel.removeMember(message.sender);
          for (var j = 0; j < this.memberListeners.length; j++) {
            this.memberListeners[j](IRC.Events.MEMBER_QUITTED, message.sender, channel);
          }
        }
        else if (message.command == 'QUIT') {
          var member = message.prefix.split('!')[0].substring(1);
          for (var channelName in this.channels) {
            var channel = this.channels[channelName];
            channel.removeMember(member);
            for (var j = 0; j < this.memberListeners.length; j++) {
              this.memberListeners[j](IRC.Events.MEMBER_QUITTED, member, channel);
            }
          }
        }
        else if (message.command == IRC.Errors.NICKNAMEINUSE) {
          this.nick += '_';
          this.forceSend(new IRC.Message('NICK', this.nick));
        }
        else if (message.command == IRC.Replies.ENDOFMOTD) {
          this.ready = true;
          while (0 < this.reservedCommands.length) {
            var command = this.reservedCommands.shift();
            this.send(command[0], command[1]);
          }
        }
        else if (message.command == IRC.Replies.NAMREPLY) {
          var channelName = message.params[message.params.length - 2];
          var tmp = message.params[message.params.length - 1];
          if (tmp.match(/^:(.+)/)) {
            var members = RegExp.$1.split(/ +/);
            var channel = this.getChannel(channelName);
            var addedMembers = channel.addMember(members);
            for (var j = 0; j < this.memberListeners.length; j++) {
              this.memberListeners[j](IRC.Events.MEMBER_ADDED, addedMembers, channel);
            }
          }
        }
        else if (message.command == IRC.Replies.TOPIC) {
          // TODO
        }

        for (var j = 0; j < this.replyListeners.length; j++) {
          this.replyListeners[j](message);
        }
      }
    }.bind(this));

    if (this.pass) this.send(new IRC.Message('PASS', this.pass));
    this.forceSend(new IRC.Message('NICK', this.nick));
    this.forceSend(new IRC.Message('USER', this.user, '0', '*', ':ando yasushi')); // TODO
  }.bind(this));
};
IRC.Server.prototype.disconnect = function() {
  if (this.tcpClient.isConnected) this.tcpClient.disconnect();
};
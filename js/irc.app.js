if (typeof(IRC) == 'undefined') var IRC = {};

IRC.App = function() {
  this.messagesElm = document.getElementsByClassName('messages')[0];
  this.logsElm = document.getElementsByClassName('logs')[0];
  this.membersElm = document.getElementsByClassName('members')[0];
  this.channelsElm = document.getElementsByClassName('channels')[0];
  this.settingsApp = new IRC.App.Settings(this);

  this.servers = {};
  this.currentServerNick = null;
  this.currentChannelName = null;
}
IRC.App.prototype.addServer = function(serverNick, server) {
  server.serverNick = serverNick;
  server.addReplyListener(this.replyListener.bind(this));
  server.addMemberListener(this.memberListener.bind(this));
  server.addChannelListener(this.channelListener.bind(this));

  var serverId = 'server-' + serverNick;
  var serverLiElm = document.createElement('li');
  serverLiElm.id = serverId;
  serverLiElm.className = 'server';
  serverLiElm.innerHTML = serverNick + '<ul></ul>';
  serverLiElm.addEventListener('click', function() {
    this.settingsApp.open(server);
  }.bind(this));
  serverLiElm.addEventListener('contextmenu', function(evt) {
    evt.preventDefault();
    // TODO: connect/disconnect
  }.bind(this));
  this.channelsElm.appendChild(serverLiElm);
  this.servers[serverNick] = server;
  this.channelListener(IRC.Events.CHANNEL_ADDED, server.channels);
};
IRC.App.prototype.getServer = function(serverNick) {
  return this.servers[serverNick];
};
IRC.App.prototype.getCurrentServer = function() {
  return this.getServer(this.currentServerNick);
};
IRC.App.prototype.getAnyServer = function() {
  for (var serverNick in this.servers) {
    return this.getServer(serverNick);
  }
  return null;
};
IRC.App.prototype.getCurrentChannel = function() {
  if (this.getCurrentServer()) {
    return this.getCurrentServer().getChannel(this.currentChannelName);
  }
  else {
    return null;
  }
};
IRC.App.prototype.focus = function(serverNick, channelName, force) {
  if (force || this.getServer(serverNick).hasChannel(channelName)) {
    this.currentServerNick = serverNick;
    this.currentChannelName = channelName;

    var channel = this.getCurrentChannel();
    if (!channel) return;

    this.messagesElm.innerHTML = '';
    for (var i = 0; i < channel.messages.length; i++) {
      this.messagesElm.innerHTML += IRC.Util.messageToHTML(channel.messages[i]);
    }
    this.membersElm.innerHTML = '';
    for (var i = 0; i < channel.members.length; i++) {
      this.membersElm.innerHTML += '<li>' + channel.members[i] + '</li>';
    }

    for (var i = 0; i < document.getElementsByClassName('channel').length; i++) {
      var elm = document.getElementsByClassName('channel')[i];
      if (elm.innerHTML == channelName) {
        elm.className = 'channel selected';
      }
      else {
        elm.className = 'channel';
      }
    }
  }
  else {
    throw 'The channel named "' + channelName + 
      '" does not exist on the server named "' + serverNick + '."';
  }
};
IRC.App.prototype.isFocused = function() {
  return this.currentServerNick != null;
};
IRC.App.prototype.log = function(obj, cls) {
  if (!cls) cls = 'message'; 
  var message = obj.toString();
  if (message.match(/^__(.+)__$/)) {
    message = chrome.i18n.getMessage(RegExp.$1) || message;
  }
  this.logsElm.innerHTML += '<span class="timestamp">' + new Date().ymdhm() + 
    '</span><span class="' + cls + '">' + message + '</span><br />';
  this.logsElm.scrollTop = this.logsElm.scrollHeight;
};
IRC.App.prototype.logWarn = function(obj) {
  this.log(obj, 'warn');
};
IRC.App.prototype.replyListener = function(reply) {
  // TODO
  //console.log(reply.toString());
  if (reply.command == 'PRIVMSG' || reply.command == 'NOTICE') {
    //reply.interprete();
    var channelName = reply.isToChannel ? reply.channelName : reply.sender;
    if (channelName == this.currentChannelName) {
      this.messagesElm.innerHTML += IRC.Util.messageToHTML(reply);
      this.messagesElm.scrollTop = this.messagesElm.scrollHeight;
    }

    // TODO
    this.storeMessage(reply);
/*
    chrome.storage.local.get(reply.fullChannelName, function(data) {
      if (!data[reply.fullChannelName]) data[reply.fullChannelName] = [];
      while (IRC.Settings.MAX_MESSAGE_LOG < data[reply.fullChannelName].length) {
        data[reply.fullChannelName].shift();
      }
      data[reply.fullChannelName].push(reply.toJSON());
      chrome.storage.local.set(data);
    });
*/
  }

  this.log(reply);
};
IRC.App.prototype.memberListener = function(eventType, members, channel) {
  if (eventType == IRC.Events.MEMBER_ADDED) {
    if (channel.name == this.currentChannelName) {
      if (!Array.isArray(members)) members = [members];
      for (var i = 0; i < members.length; i++) {
        this.membersElm.innerHTML += '<li>' + members[i] + '</li>';
/*
        var member = members[i];
        var newLi = document.createElement('li');
        newLi.innerHTML = member;
        var added = false;
        for (var j = 0; j < this.membersElm.childNodes.length; j++) {
          var li = this.membersElm.childNodes[j];
          if (member < li.innerHTML) {
            li.insertBefore(newLi);
            added = true;
            break;
          }
        }
        if (!added) this.membersElm.appendChild(newLi);
*/
      }
    }
  }
  else if (eventType == IRC.Events.MEMBER_QUITTED) {
    if (channel.name == this.currentChannelName) {
      if (!Array.isArray(members)) members = [members];
      var removedDivs = [];
      for (var i = 0; i < members.length; i++) {
        var member = members[i];
        for (var j = 0; j < this.membersElm.childNodes.length; j++) {
          var div = this.membersElm.childNodes[j];
          if (div.innerHTML == member) {
            removedDivs.push(div);
          }
        }
      }
      for (var i = 0; i < removedDivs.length; i++) {
        var removedDiv = removedDivs[i];
        removedDiv.parentNode.removeChild(removedDiv);
      }
    }
  }
};
IRC.App.prototype.channelListener = function(eventType, channels) {
  if (eventType == IRC.Events.CHANNEL_ADDED) {
    for (var channelName in channels) {
      var channel = channels[channelName];
      // TODO
      var serverElm = document.getElementById('server-' + channel.server.serverNick);
      var serverUlElm = serverElm.getElementsByTagName('ul')[0];
      var channelLiElm = document.createElement('li');
      channelLiElm.obj = channel;
      channelLiElm.innerHTML = channelName;
      channelLiElm.className = channelName == this.currentChannelName 
        ? 'channel selected' 
        : 'channel';
      channelLiElm.addEventListener('click', function(evt) {
        evt.stopPropagation();
        this.focus(serverElm.childNodes[0].textContent, evt.target.innerHTML);
      }.bind(this));
      channelLiElm.addEventListener('contextmenu', function(evt) {
        evt.preventDefault();
        // TODO: rejoin/leave
      }.bind(this));
      serverUlElm.appendChild(channelLiElm);
    }
  }
  else if (eventType == IRC.Events.CHANNEL_REMOVED) {
    for (var channelName in channels) {
      var channel = channels[channelName];
      // TODO
      var serverElm = document.getElementById('server-' + channel.server.serverNick);
      var serverUlElm = serverElm.getElementsByTagName('ul')[0];
      for (var i = 0; i < serverUlElm.childNodes.length; i++) {
        var liElm = serverUlElm.childNodes[i];
        if (liElm.childNodes[0].textContent == channelName) {
          liElm.parentNode.removeChild(liElm);
        }
      }
    }
  }
};
IRC.App.prototype.storeMessage = function(message) {
  chrome.storage.local.get(message.fullChannelName, function(data) {
    if (!data[message.fullChannelName]) data[message.fullChannelName] = [];
    while (IRC.Settings.MAX_MESSAGE_LOG < data[message.fullChannelName].length) {
      data[message.fullChannelName].shift();
    }
    data[message.fullChannelName].push(message.toJson());
    chrome.storage.local.set(data);
  });
};
IRC.App.start = function() {
  function $(id) {return document.getElementById(id)}

  var app = new IRC.App();
  chrome.storage.local.get('current', function(data) {
    if (data.current) {
      this.focus(data.current.serverNick, data.current.channelName, true);
    }
  }.bind(app));
  IRC.Settings.ifExists(
    function(serverNicks) {
      for (var i = 0; i < serverNicks.length; i++) {
        var serverNick = serverNicks[i];
        var settings = IRC.Settings.load(serverNick, function(serverNick, settings) {
          // TODO
          var server = new IRC.Server(settings.host, settings.port, 
            settings.nick, settings.user, settings.pass, settings.encoding);
          for (var j = 0; j < settings.channels.length; j++) {
            server.addChannel(settings.channels[j]);
          }

          // TODO
          chrome.storage.local.get(null, function(data) {
            for (var channelName in server.channels) {
              var channel = server.getChannel(channelName);
              var messages = data[channel.getFqn()];
              if (messages) {
                for (var j = 0; j < messages.length; j++) {
                  messages[j] = IRC.Message.fromJson(messages[j], server);
                }
                channel.messages = messages;
              }
            }
          });

          this.addServer(serverNick, server);
          if (!this.isFocused()) {
            this.focus(serverNick, settings.channels[0]);
          }

          if (navigator.onLine) {
            server.connect();
            server.joinAllOnConnect();
          }
          else {
            this.logWarn('__warnOffline__');
          }
        }.bind(this));
      }
    }.bind(app),
    function() {
      this.settingsApp.open();
    }.bind(app)
  );

  window.addEventListener('online', function() {
    app.log('__online__');
    for (var serverName in this.servers) {
      setTimeout(function() {
        this.connect();
        this.joinAllOnConnect();
      }.bind(this.getServer(serverName)), 50);
    }
  }.bind(app), false);

  window.addEventListener('offline', function() {
    app.logWarn('__warnOffline__');
    for (var serverName in this.servers) {
      var server = this.getServer(serverName);
      server.disconnect();
      server.removeAllMembers();
    }
  }.bind(app), false);

  $('command').addEventListener('keypress', function(evt) {
    if (evt.keyCode == 13) { // enter key
      var text = evt.target.value;
      if (text.replace(/\s+/, '').length == 0) return;
      var message;
      if (text.match(/^\/(.+)/)) {
        // TODO
        message = RegExp.$1;
        this.getCurrentServer().send(message);
      }
      else {
        if (!text.match(/^:/)) text = ':' + text
        var channel = this.getCurrentChannel();
        var command = evt.ctrlKey ? 'NOTICE' : 'PRIVMSG';
        // TODO
        message = new IRC.Message(command, channel.name, text);
        message.server = this.getCurrentServer(); // TODO
        //var prefix = ':' + this.getCurrentServer().nick + '!';
        //var message = new IRC.Message(prefix, 'PRIVMSG', channel.name, text);
        channel.sendMessage(message);
        message.prefix = ':' + this.getCurrentServer().nick + '!'; // TODO
        message.interprete(); // TODO
        this.messagesElm.innerHTML += IRC.Util.messageToHTML(message);
        this.messagesElm.scrollTop = this.messagesElm.scrollHeight;
        this.storeMessage(message);
      }
      this.log(message);
      evt.target.value = '';
    }
  }.bind(app));

  $('add-new-server').addEventListener('click', function() {
    this.settingsApp.open();
  }.bind(app));

  return app;
};
